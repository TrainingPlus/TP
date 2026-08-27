-- Database creation schema for Training Plus Institute System

CREATE DATABASE IF NOT EXISTS `training_plus_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `training_plus_db`;

-- Table structure for students
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cpr` VARCHAR(9) NOT NULL UNIQUE,
  `student_number` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `gender` ENUM('male', 'female') DEFAULT 'male',
  `major` VARCHAR(150) DEFAULT NULL,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for system credentials
CREATE TABLE IF NOT EXISTS `system_credentials` (
  `role` VARCHAR(50) PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default credentials
INSERT INTO `system_credentials` (`role`, `username`, `password`) 
VALUES 
('operator', 'operator', 'op1234'),
('manager', 'admin', 'admin1234')
ON DUPLICATE KEY UPDATE `role`=`role`;
