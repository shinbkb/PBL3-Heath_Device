/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * <h2><center>&copy; Copyright (c) 2020 STMicroelectronics.
  * All rights reserved.</center></h2>
  *
  * This software component is licensed by ST under BSD 3-Clause license,
  * the "License"; You may not use this file except in compliance with the
  * License. You may obtain a copy of the License at:
  *                        opensource.org/licenses/BSD-3-Clause
  *
  ******************************************************************************
  */
/* USER CODE END Header */

/* Includes ------------------------------------------------------------------*/
#include "main.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include "MAX30102.h"
#include "printf.h"
#include "algorithm_by_RF.h"
#include "stdio.h"
#include "stm32f1xx_hal.h"
#include "ssd1306.h"
#include "ssd1306_fonts.h"

/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */
/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */
#define MAX_BRIGHTNESS 		255U
#define MY_SNPRINTF 		snprintf	// newlib snprintf with float support is too heavy and not threadsafe so using local snprintf from printf.c
										// but this causes a compile warning that float support is off so use this macro to prevent it
//#define FAKE_MAX30102_CLONE				// if you have a fake Chinese cloned MAX30102 define this
#define MLX90614_I2C_ADDR (0x5A << 1)
#define MLX90614_TA_REG   0x06  // Ambient temperature register
#define MLX90614_TO_REG   0x07  // Object temperature register
#define I2C1_SCL_GPIO_Port GPIOB//set up chân cho đúng dù đã setup
#define I2C1_SCL_Pin       GPIO_PIN_6//set up chân cho đúng dù đã setup
#define I2C1_SDA_GPIO_Port GPIOB //set up chân cho đúng dù đã setup
#define I2C1_SDA_Pin       GPIO_PIN_7//set up chân cho đúng dù đã setup
#define HR_FILTER_SIZE 5//code chong nhieu

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
I2C_HandleTypeDef hi2c1;
I2C_HandleTypeDef hi2c2;//không dùng được

TIM_HandleTypeDef htim4;

UART_HandleTypeDef huart2;

/* USER CODE BEGIN PV */
static uint32_t aun_ir_buffer[BUFFER_SIZE]; //infrared LED sensor data
static uint32_t aun_red_buffer[BUFFER_SIZE];  //red LED sensor data
float g_spo2 = 0;//biến toàn cục
int32_t g_heart_rate = 0;//biến toàn cục
int8_t g_hr_valid = 0;//biến toàn cục
int8_t g_spo2_valid = 0;//biến toàn cục
uint32_t prev_temp_time = 0; // thời gian lần cuối đọc nhiệt độ
const uint32_t temp_interval = 2000; // đọc nhiệt độ mỗi 2 giây
int hr_filter[HR_FILTER_SIZE] = {0};//code chong nhieu
uint8_t hr_index = 0;//code chong nhieu
/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_I2C1_Init(void);
static void MX_TIM4_Init(void);
static void MX_USART2_UART_Init(void);
static void MX_I2C2_Init(void);
/* USER CODE BEGIN PFP */
static void Max30102Setup(void);
static void Max30102Loop(void);
float MLX90614_ReadTemp(uint8_t reg);
static uint8_t finger_present = 0;//bien check xem co tay hay khong
static void DebugPrint(const char *text);
void SetPwmDutyCycle(uint8_t percent);
char uart_buf[100];// tạo mảng gồm 100 phần tử)


/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */
static void DebugPrint(const char *text)//uart
{
  HAL_UART_Transmit(&huart2, (uint8_t *)text, strlen(text), 100U);
}

void SetPwmDutyCycle(uint8_t percent)
{
  TIM_OC_InitTypeDef sConfigOC = {0};

  sConfigOC.OCMode = TIM_OCMODE_PWM1;
  sConfigOC.Pulse = percent * 5U;
  sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH;
  sConfigOC.OCFastMode = TIM_OCFAST_DISABLE;
  HAL_TIM_PWM_ConfigChannel(&htim4, &sConfigOC, TIM_CHANNEL_3);
  HAL_TIM_PWM_Start(&htim4, TIM_CHANNEL_3);
}

void Max30102Setup()
{
  uint8_t uch_dummy;

  maxim_max30102_reset();
  maxim_max30102_read_reg(REG_INTR_STATUS_1, &uch_dummy);  // reads/clears the interrupt status register
  maxim_max30102_init();
}

// Takes samples from MAX30102.  Heart rate and SpO2 are calculated every ST seconds
void Max30102Loop()//hàm chính cảm biến oxy
{
  char buf[100];
  float n_spo2;
  float ratio;
  float correl;
  int8_t ch_spo2_valid;  				// indicator to show if the SPO2 calculation is valid
  int32_t n_heart_rate; 				// heart rate value
  int8_t  ch_hr_valid;  				// indicator to show if the heart rate calculation is valid
  uint8_t i;
  static uint32_t un_min = 0x3FFFFUL;
  static uint32_t un_max = 0UL;
  static uint32_t un_prev_data = 0UL;  	// variables to calculate the on-board LED brightness that reflects the heartbeats
  static float f_brightness = 0UL;
  float f_temp;
   #define IR_THRESHOLD 50000
  // buffer length of BUFFER_SIZE stores ST seconds of samples running at FS sps
  for (i = 0U; i < BUFFER_SIZE; i++)
  {
	while (HAL_GPIO_ReadPin(GPIOB, GPIO_PIN_13) == GPIO_PIN_SET);	// wait until the interrupt pin asserts

#ifdef FAKE_MAX30102_CLONE
    maxim_max30102_read_fifo((aun_ir_buffer + i), (aun_red_buffer + i));  // read from MAX30102 FIFO
#else
    maxim_max30102_read_fifo((aun_red_buffer + i), (aun_ir_buffer + i));  // read from MAX30102 FIFO
#endif

    if (aun_ir_buffer[i] < IR_THRESHOLD)
          {
              if (finger_present == 1)
              {
                  finger_present = 0;
                  DebugPrint("Finger removed - pause sensor\r\n");
              }

              // Ngắt đo và thoát sớm, không cập nhật dữ liệu mới
//              return;
              break;
          }
          else
          {
              if (finger_present == 0)
              {
                  finger_present = 1;
                  DebugPrint("Finger detected - resume measurement\r\n");
              }
          }
    // calculate LED brightness
    if (aun_red_buffer[i] > un_prev_data)
    {
      f_temp = aun_red_buffer[i] - un_prev_data;
      f_temp /= (un_max - un_min);
      f_temp *= MAX_BRIGHTNESS;
      f_brightness -= 2.0f * f_temp;
      if (f_brightness < 0.0f)
      {
        f_brightness = 0.0f;
      }
    }
    else
    {
	  f_temp = un_prev_data - aun_red_buffer[i];
	  f_temp /= (un_max - un_min);
	  f_temp *= MAX_BRIGHTNESS;
	  f_brightness += 2.0f * f_temp;
	  if (f_brightness > (float)MAX_BRIGHTNESS)
	  {
		f_brightness = (float)MAX_BRIGHTNESS;
	  }
    }

    SetPwmDutyCycle((uint8_t)(f_brightness * 100.0f / 256.0f));
    un_prev_data = aun_red_buffer[i];
  }

  un_min = 0x3FFFFUL;
  un_max = 0UL;
  for (i = 0U; i < BUFFER_SIZE; i++)
  {
    if (un_min > aun_red_buffer[i])
    {
      un_min = aun_red_buffer[i];    //update signal min for next cycle using values from this cycle
    }
    if (un_max < aun_red_buffer[i])
    {
      un_max = aun_red_buffer[i];    //update signal max for next cycle using values from this cycle
    }
  }

  // calculate heart rate and SpO2 after BUFFER_SIZE samples (ST seconds of samples) using Robert's method
  rf_heart_rate_and_oxygen_saturation(aun_ir_buffer, BUFFER_SIZE, aun_red_buffer, &n_spo2, &ch_spo2_valid, &n_heart_rate, &ch_hr_valid, &ratio, &correl);

  // display results
  if (ch_hr_valid && ch_spo2_valid)
  {
	  memset(buf, 0, sizeof(buf));
	      MY_SNPRINTF(buf, sizeof(buf), "Oxi: %3.1f%%\r\n", n_spo2);
	      DebugPrint(buf);
	      // n_heart_rate tính từ Max30102Loop()
	      memset(buf, 0, sizeof(buf));
	      MY_SNPRINTF(buf, sizeof(buf), "Nhip Tim: %d bpm\r\n", n_heart_rate);
	       // n_spo2 tính từ Max30102Loop()
	      DebugPrint(buf);
  }
  else
  {
    DebugPrint("Not valid. Are you still alive?\r\n");
  }
//  rf_heart_rate_and_oxygen_saturation(
//      aun_ir_buffer, BUFFER_SIZE, aun_red_buffer,
//      &n_spo2, &ch_spo2_valid,
//      &n_heart_rate, &ch_hr_valid,
//      &ratio, &correl
//  );

  // Lưu vào biến global chỉ giá trị mới có thể lưu còn ko có giá trị thì không lưu
  if (ch_hr_valid && ch_spo2_valid) {

  g_heart_rate = n_heart_rate;
  g_spo2 = n_spo2;
  g_hr_valid = ch_hr_valid;
  g_spo2_valid = ch_spo2_valid;
}

 }

/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{
  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
//  do {
//      I2C1_BusRecovery();
//      MX_I2C1_Init();
//  } while (__HAL_I2C_GET_FLAG(&hi2c1, I2C_FLAG_BUSY));// chạy i2c busrecovery liên tục sau đó chạy i2c nếu bị treo
  I2C1_BusRecovery();
   MX_I2C1_Init();

//
  if (__HAL_I2C_GET_FLAG(&hi2c1, I2C_FLAG_BUSY)) {
      // Bus vẫn bận => phải bus recovery lại lần nữa// bảo hiểm

      MX_I2C1_Init();
  }



  // Reset I2C1 để chắc chắn clear lỗi
//
//  MX_I2C1_Init();
  Max30102Setup();


  MX_TIM4_Init();
  MX_USART2_UART_Init();

  MX_I2C2_Init();
  /* USER CODE BEGIN 2 */
  HAL_TIM_PWM_Start(&htim4, TIM_CHANNEL_3);
  HAL_Delay(500);


  // ===== Khởi tạo OLED =====
  HAL_Delay(100);
  ssd1306_Init();
  HAL_Delay(100);
  ssd1306_Fill(Black);
  ssd1306_WriteString("OLED Ready", Font_7x10, White);
  ssd1306_UpdateScreen();
  HAL_Delay(1000);

  // ===== Xóa màn hình để bắt đầu hiển thị dữ liệu =====
  ssd1306_Fill(Black);
  ssd1306_WriteString("Waiting data...", Font_7x10, White);
  ssd1306_UpdateScreen();

//  for (uint8_t i = 0; i < 128; i++) {
//      if (HAL_I2C_IsDeviceReady(&hi2c1, i << 1, 2, 10) == HAL_OK) {
//          char buf[50];
//          sprintf(buf, "I2C device found at 0x%02X\r\n", i);
//          DebugPrint(buf);
//      }
//  }

  /* USER CODE END 2 */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
	  // 1. Đọc và tính toán MAX30102 (Nhịp tim/SpO2)
	  	  // Hàm này tự xử lý việc đọc 100 mẫu và tính toán, và in kết quả ra UART.
	  	  Max30102Loop();
	  	  uint32_t current_time = HAL_GetTick();
	  	   if (current_time - prev_temp_time >= temp_interval)
	  	    {
	  		  prev_temp_time = current_time;
	  	  // 2. Đọc MLX90614 (Nhiệt độ)


	  	    if (finger_present) // chỉ đọc khi có tay
	  	    {
	  	  float ambient_temp = MLX90614_ReadTemp(MLX90614_TA_REG);
	  	  float object_temp = MLX90614_ReadTemp(MLX90614_TO_REG);

	  	  // 3. Gửi kết quả MLX90614 qua UART
	  	  snprintf(uart_buf, sizeof(uart_buf),"Ambient Temp: %.2f C, Object Temp: %.2f C\r\n",ambient_temp, object_temp);
	  	  DebugPrint(uart_buf); // Dùng DebugPrint cho sự nhất quán

	  	  ssd1306_Fill(Black);
	  	    ssd1306_SetCursor(0, 0);
	  	    ssd1306_WriteString("nhiptim va nhietdo", Font_7x10, White);
	  	    // BPM


            // obj_temp
	  	    char buf1[20];
	  	    sprintf(buf1, "human temp: %.2fC", object_temp);
	  	    ssd1306_SetCursor(0, 36);
	  	    ssd1306_WriteString(buf1, Font_7x10, White);
	  	    // amb_temp
	  	    char buf2[20];//
	  	    sprintf(buf2, "around temp: %.2fC", ambient_temp);
	  	    ssd1306_SetCursor(0, 48);
	  	    ssd1306_WriteString(buf2, Font_7x10, White);



	  	 if (g_hr_valid && g_spo2_valid) {
	  	 char buf[20];
	     sprintf(buf, "BPM: %d", g_heart_rate);
	     ssd1306_SetCursor(0, 12);
	  	 ssd1306_WriteString(buf, Font_7x10, White);

	  	 sprintf(buf, "Oxi: %.1f%%", g_spo2);
	  	 ssd1306_SetCursor(0, 24);
	  	 ssd1306_WriteString(buf, Font_7x10, White);
	  	 }
	  	    }
	  	 ssd1306_UpdateScreen();
	  	    }
	  	  /* Delay 1 giây trước k hi lặp lại toàn bộ quá trình */
//	  	 else
//	  	     {
//	  	         // Không có tay → xóa màn hình hoặc hiển thị thông báo
//	  	         ssd1306_Fill(Black);
//	  	         ssd1306_SetCursor(0, 24);
//	  	         ssd1306_WriteString("bo ca 2 tay ", Font_7x10, White);
//	  	         ssd1306_UpdateScreen();
//	  	     }
  }
  /* USER CODE END 3 */
}
float MLX90614_ReadTemp(uint8_t reg)
{
   uint8_t data[3];  // 2 byte data + 1 byte PEC (CRC)
   uint16_t temp_raw;
   float temp_celsius;
   if (HAL_I2C_Mem_Read(&hi2c1, MLX90614_I2C_ADDR, reg, I2C_MEMADD_SIZE_8BIT, data, 3, HAL_MAX_DELAY) != HAL_OK)
   {
   	 return -273.15f;
   }
   temp_raw = (data[1] << 8) | data[0];
   temp_celsius = (temp_raw * 0.02) - 273.15;
//   HAL_Delay(5);
   return temp_celsius;
}

void I2C1_BusRecovery(void) {
    GPIO_InitTypeDef GPIO_InitStruct = {0};

    // 1. Config SCL & SDA as Open-Drain Output
    __HAL_RCC_GPIOB_CLK_ENABLE();
    GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_OD;
    GPIO_InitStruct.Pull = GPIO_PULLUP;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;

    // PB6 = SCL, PB7 = SDA (I2C1 default)
    GPIO_InitStruct.Pin = GPIO_PIN_6 | GPIO_PIN_7;
    HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);

    // 2. Phát 9 xung clock trên SCL
    for (int i = 0; i < 9; i++) {
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);
        HAL_Delay(1);
        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_RESET);
        HAL_Delay(1);
    }

    // 3. Thả SDA & SCL lên HIGH
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_6, GPIO_PIN_SET);
    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, GPIO_PIN_SET);
    HAL_Delay(1);

    // 4. Config lại chân về Alternate Function Open-Drain cho I2C1
    GPIO_InitStruct.Mode = GPIO_MODE_AF_OD;
    GPIO_InitStruct.Pin = GPIO_PIN_6 | GPIO_PIN_7;
    HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Initializes the CPU, AHB and APB busses clocks
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSI_DIV2;
  RCC_OscInitStruct.PLL.PLLMUL = RCC_PLL_MUL16;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }
  /** Initializes the CPU, AHB and APB busses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_2) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief I2C1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_I2C1_Init(void)
{
  __HAL_RCC_I2C1_FORCE_RESET();
  __HAL_RCC_I2C1_RELEASE_RESET();
  /* USER CODE BEGIN I2C1_Init 0 */

  /* USER CODE END I2C1_Init 0 */

  /* USER CODE BEGIN I2C1_Init 1 */

  /* USER CODE END I2C1_Init 1 */
  hi2c1.Instance = I2C1;
  hi2c1.Init.ClockSpeed = 100000;
  hi2c1.Init.DutyCycle = I2C_DUTYCYCLE_2;
  hi2c1.Init.OwnAddress1 = 0;
  hi2c1.Init.AddressingMode = I2C_ADDRESSINGMODE_7BIT;
  hi2c1.Init.DualAddressMode = I2C_DUALADDRESS_DISABLE;
  hi2c1.Init.OwnAddress2 = 0;
  hi2c1.Init.GeneralCallMode = I2C_GENERALCALL_DISABLE;
  hi2c1.Init.NoStretchMode = I2C_NOSTRETCH_DISABLE;
  if (HAL_I2C_Init(&hi2c1) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN I2C1_Init 2 */

  /* USER CODE END I2C1_Init 2 */

}

/**
  * @brief I2C2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_I2C2_Init(void)
{

  /* USER CODE BEGIN I2C2_Init 0 */

  /* USER CODE END I2C2_Init 0 */

  /* USER CODE BEGIN I2C2_Init 1 */

  /* USER CODE END I2C2_Init 1 */
  hi2c2.Instance = I2C2;
  hi2c2.Init.ClockSpeed = 100000;
  hi2c2.Init.DutyCycle = I2C_DUTYCYCLE_2;
  hi2c2.Init.OwnAddress1 = 0;
  hi2c2.Init.AddressingMode = I2C_ADDRESSINGMODE_7BIT;
  hi2c2.Init.DualAddressMode = I2C_DUALADDRESS_DISABLE;
  hi2c2.Init.OwnAddress2 = 0;
  hi2c2.Init.GeneralCallMode = I2C_GENERALCALL_DISABLE;
  hi2c2.Init.NoStretchMode = I2C_NOSTRETCH_DISABLE;
  if (HAL_I2C_Init(&hi2c2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN I2C2_Init 2 */

  /* USER CODE END I2C2_Init 2 */

}

/**
  * @brief TIM4 Initialization Function
  * @param None
  * @retval None
  */
static void MX_TIM4_Init(void)
{

  /* USER CODE BEGIN TIM4_Init 0 */

  /* USER CODE END TIM4_Init 0 */

  TIM_MasterConfigTypeDef sMasterConfig = {0};
  TIM_OC_InitTypeDef sConfigOC = {0};

  /* USER CODE BEGIN TIM4_Init 1 */

  /* USER CODE END TIM4_Init 1 */
  htim4.Instance = TIM4;
  htim4.Init.Prescaler = 1;
  htim4.Init.CounterMode = TIM_COUNTERMODE_UP;
  htim4.Init.Period = 500;
  htim4.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
  htim4.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_DISABLE;
  if (HAL_TIM_PWM_Init(&htim4) != HAL_OK)
  {
    Error_Handler();
  }
  sMasterConfig.MasterOutputTrigger = TIM_TRGO_RESET;
  sMasterConfig.MasterSlaveMode = TIM_MASTERSLAVEMODE_DISABLE;
  if (HAL_TIMEx_MasterConfigSynchronization(&htim4, &sMasterConfig) != HAL_OK)
  {
    Error_Handler();
  }
  sConfigOC.OCMode = TIM_OCMODE_PWM1;
  sConfigOC.Pulse = 350;
  sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH;
  sConfigOC.OCFastMode = TIM_OCFAST_DISABLE;
  if (HAL_TIM_PWM_ConfigChannel(&htim4, &sConfigOC, TIM_CHANNEL_3) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN TIM4_Init 2 */

  /* USER CODE END TIM4_Init 2 */
  HAL_TIM_MspPostInit(&htim4);

}

/**
  * @brief USART2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART2_UART_Init(void)
{

  /* USER CODE BEGIN USART2_Init 0 */

  /* USER CODE END USART2_Init 0 */

  /* USER CODE BEGIN USART2_Init 1 */

  /* USER CODE END USART2_Init 1 */
  huart2.Instance = USART2;
  huart2.Init.BaudRate = 115200;
  huart2.Init.WordLength = UART_WORDLENGTH_8B;
  huart2.Init.StopBits = UART_STOPBITS_1;
  huart2.Init.Parity = UART_PARITY_NONE;
  huart2.Init.Mode = UART_MODE_TX_RX;
  huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart2.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART2_Init 2 */

  /* USER CODE END USART2_Init 2 */

}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();

  /*Configure GPIO pin : PB13 */
  GPIO_InitStruct.Pin = GPIO_PIN_13;
  GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);

}

/* USER CODE BEGIN 4 */

/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */

  /* USER CODE END Error_Handler_Debug */
}

#ifdef  USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     tex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */

/************************ (C) COPYRIGHT STMicroelectronics *****END OF FILE****/
