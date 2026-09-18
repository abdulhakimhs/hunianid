-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Generation Time: Aug 09, 2026 at 08:39 PM
-- Server version: 8.0.46
-- PHP Version: 8.5.8

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hunianid`
--

-- --------------------------------------------------------

--
-- Table structure for table `indonesia_cities`
--

CREATE TABLE `indonesia_cities` (
  `id` bigint UNSIGNED NOT NULL,
  `code` char(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province_code` char(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `indonesia_districts`
--

CREATE TABLE `indonesia_districts` (
  `id` bigint UNSIGNED NOT NULL,
  `code` char(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city_code` char(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `indonesia_provinces`
--

CREATE TABLE `indonesia_provinces` (
  `id` bigint UNSIGNED NOT NULL,
  `code` char(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `indonesia_villages`
--

CREATE TABLE `indonesia_villages` (
  `id` bigint UNSIGNED NOT NULL,
  `code` char(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `district_code` char(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `indonesia_cities`
--
ALTER TABLE `indonesia_cities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `indonesia_cities_code_unique` (`code`),
  ADD KEY `indonesia_cities_province_code_foreign` (`province_code`);

--
-- Indexes for table `indonesia_districts`
--
ALTER TABLE `indonesia_districts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `indonesia_districts_code_unique` (`code`),
  ADD KEY `indonesia_districts_city_code_foreign` (`city_code`);

--
-- Indexes for table `indonesia_provinces`
--
ALTER TABLE `indonesia_provinces`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `indonesia_provinces_code_unique` (`code`);

--
-- Indexes for table `indonesia_villages`
--
ALTER TABLE `indonesia_villages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `indonesia_villages_code_unique` (`code`),
  ADD KEY `indonesia_villages_district_code_foreign` (`district_code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `indonesia_cities`
--
ALTER TABLE `indonesia_cities`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `indonesia_districts`
--
ALTER TABLE `indonesia_districts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `indonesia_provinces`
--
ALTER TABLE `indonesia_provinces`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `indonesia_villages`
--
ALTER TABLE `indonesia_villages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `indonesia_cities`
--
ALTER TABLE `indonesia_cities`
  ADD CONSTRAINT `indonesia_cities_province_code_foreign` FOREIGN KEY (`province_code`) REFERENCES `indonesia_provinces` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `indonesia_districts`
--
ALTER TABLE `indonesia_districts`
  ADD CONSTRAINT `indonesia_districts_city_code_foreign` FOREIGN KEY (`city_code`) REFERENCES `indonesia_cities` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `indonesia_villages`
--
ALTER TABLE `indonesia_villages`
  ADD CONSTRAINT `indonesia_villages_district_code_foreign` FOREIGN KEY (`district_code`) REFERENCES `indonesia_districts` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
