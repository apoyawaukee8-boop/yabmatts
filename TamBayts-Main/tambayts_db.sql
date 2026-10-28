-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: tambayts_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `tambayts_db`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `tambayts_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `tambayts_db`;

--
-- Table structure for table `favorites`
--

DROP TABLE IF EXISTS `favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `favorites` (
  `user_id` bigint(20) unsigned NOT NULL,
  `menu_item_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`,`menu_item_id`),
  KEY `fk_favorites_menu` (`menu_item_id`),
  CONSTRAINT `fk_favorites_menu` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorites`
--

LOCK TABLES `favorites` WRITE;
/*!40000 ALTER TABLE `favorites` DISABLE KEYS */;
/*!40000 ALTER TABLE `favorites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_items`
--

DROP TABLE IF EXISTS `menu_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `menu_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stall` varchar(80) NOT NULL,
  `category` varchar(60) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_menu_items_price` CHECK (`price` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_items`
--

LOCK TABLES `menu_items` WRITE;
/*!40000 ALTER TABLE `menu_items` DISABLE KEYS */;
INSERT INTO `menu_items` VALUES (1,'Chicken Pastil',25.00,'Campus Stall','meals',NULL,1,'2026-10-07 14:38:37'),(2,'Buffalo Wings',80.00,'Campus Stall','meals',NULL,1,'2026-10-07 14:38:37'),(3,'Sisig',80.00,'Campus Stall','meals',NULL,1,'2026-10-07 14:38:37'),(4,'Siomai Rice',45.00,'Campus Stall','meals',NULL,1,'2026-10-07 14:38:37'),(5,'Beef Steak',75.00,'Campus Stall','meals',NULL,1,'2026-10-07 14:38:37'),(6,'Tapsilog',80.00,'Campus Stall','meals',NULL,1,'2026-10-07 14:38:37'),(8,'Hotsilog',65.00,'Campus Stall','meals',NULL,1,'2026-10-07 14:38:37'),(9,'Hungsilog',70.00,'Campus Stall','meals',NULL,1,'2026-10-07 14:38:37'),(10,'Bottled Iced Tea',25.00,'Campus Stall','drinks',NULL,1,'2026-10-07 14:38:37'),(11,'Fruit Bowl',60.00,'Campus Stall','healthy',NULL,1,'2026-10-07 14:38:37'),(12,'Cheese Sticks',35.00,'Campus Stall','snacks',NULL,1,'2026-10-07 14:38:37'),(13,'Carbonara',75.00,'Campus Stall','pasta',NULL,1,'2026-10-07 14:38:37'),(16,'Sisigsilog',80.00,'Mj\'s Silugan','meals',NULL,1,'2026-10-28 12:17:02');
/*!40000 ALTER TABLE `menu_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) unsigned NOT NULL,
  `menu_item_id` bigint(20) unsigned DEFAULT NULL,
  `item_name` varchar(120) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `fk_order_items_menu` (`menu_item_id`),
  CONSTRAINT `fk_order_items_menu` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_order_items_price` CHECK (`unit_price` >= 0),
  CONSTRAINT `chk_order_items_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,2,'Buffalo Wings',80.00,2),(2,2,2,'Buffalo Wings',80.00,4),(3,3,3,'Sisig',80.00,5),(4,3,NULL,'Yema',5.00,11),(5,3,8,'Hotsilog',65.00,3),(6,4,2,'Buffalo Wings',80.00,5),(7,5,2,'Buffalo Wings',80.00,1),(8,6,2,'Buffalo Wings',80.00,1),(9,7,1,'Chicken Pastil',25.00,4),(10,7,3,'Sisig',80.00,4),(11,8,3,'Sisig',80.00,4),(12,8,2,'Buffalo Wings',80.00,3),(13,8,4,'Siomai Rice',45.00,2),(14,9,2,'Buffalo Wings',80.00,4),(15,10,2,'Buffalo Wings',80.00,4),(16,10,1,'Chicken Pastil',25.00,3),(17,11,2,'Buffalo Wings',80.00,5),(18,12,1,'Chicken Pastil',25.00,4),(19,13,2,'Buffalo Wings',80.00,4),(21,15,2,'Buffalo Wings',80.00,4),(22,16,16,'Sisigsilog',80.00,4),(23,17,1,'Chicken Pastil',25.00,4),(25,19,1,'Chicken Pastil',25.00,1),(26,19,3,'Sisig',80.00,1),(27,19,2,'Buffalo Wings',80.00,1),(28,19,10,'Bottled Iced Tea',25.00,3);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_code` varchar(32) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `status` enum('Pending','Preparing','Ready','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `total` decimal(10,2) NOT NULL,
  `payment_method` varchar(40) NOT NULL DEFAULT 'cash_on_pickup',
  `payment_status` enum('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_order_code` (`order_code`),
  KEY `idx_orders_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_orders_total` CHECK (`total` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,'TB-D76BB33DA195',1,'Completed',160.00,'cash_on_pickup','paid','2026-10-21 05:28:43','2026-10-28 12:43:22'),(2,'TB-4BFA7A94910B',1,'Completed',320.00,'cash_on_pickup','paid','2026-10-21 05:32:24','2026-10-28 12:43:22'),(3,'TB-379DB071BBD3',1,'Completed',650.00,'cash_on_pickup','paid','2026-10-21 05:54:27','2026-10-28 12:43:22'),(4,'TB-B53FFD685959',6,'Completed',400.00,'cash_on_pickup','paid','2026-10-28 11:10:27','2026-10-28 12:43:22'),(5,'TB-47CFDCEE9D9F',6,'Completed',80.00,'cash_on_pickup','paid','2026-10-28 11:24:19','2026-10-28 12:43:22'),(6,'TB-34AE25305D56',6,'Completed',80.00,'cash_on_pickup','paid','2026-10-28 11:26:24','2026-10-28 12:43:22'),(7,'TB-E620BF1720B1',6,'Completed',420.00,'cash_on_pickup','paid','2026-10-28 11:30:41','2026-10-28 12:43:22'),(8,'TB-A61ACACB8BB1',6,'Completed',650.00,'cash_on_pickup','paid','2026-10-28 11:37:20','2026-10-28 12:43:22'),(9,'TB-4CF0038343C5',6,'Completed',320.00,'cash_on_pickup','paid','2026-10-28 11:50:37','2026-10-28 12:43:22'),(10,'TB-FD103668448E',6,'Completed',395.00,'cash_on_pickup','paid','2026-10-28 12:01:39','2026-10-28 12:43:22'),(11,'TB-E984449D42E2',6,'Completed',400.00,'cash_on_pickup','paid','2026-10-28 12:04:47','2026-10-28 12:43:22'),(12,'TB-9C9EDB752450',6,'Completed',100.00,'cash_on_pickup','paid','2026-10-28 12:10:14','2026-10-28 12:43:22'),(13,'TB-2903C292F510',6,'Completed',320.00,'cash_on_pickup','paid','2026-10-28 12:17:38','2026-10-28 12:43:22'),(15,'TB-D77AC441D614',6,'Completed',320.00,'cash_on_pickup','paid','2026-10-28 12:25:36','2026-10-28 12:43:22'),(16,'TB-F7D05E81B808',6,'Completed',320.00,'cash_on_pickup','paid','2026-10-28 12:26:13','2026-10-28 12:43:22'),(17,'TB-79CD45FC1526',6,'Completed',100.00,'cash_on_pickup','paid','2026-10-28 12:31:55','2026-10-28 12:43:22'),(19,'TB-81B8952B0992',6,'Completed',260.00,'cash_on_pickup','paid','2026-10-28 12:41:37','2026-10-28 12:44:51');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('student','admin') NOT NULL DEFAULT 'student',
  `course` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `client_id` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_client_id` (`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Alex P.','guest-6a43cabe-a2d3-42e0-afdf-8df7bdf4b9da@guest.tambayts.local','$2y$10$u.uyotdEAY8LS3sV824AiOcObJO7AnpvS0ScS2ZmwgpUyuEK1IGfu','student',NULL,'2026-10-21 05:28:43','2026-10-21 05:28:43','6a43cabe-a2d3-42e0-afdf-8df7bdf4b9da'),(2,'bryan','12345@gmail.com','$2y$10$P7obprTav2f2JGJUtqYk0eizvHdxGLTKz.am1EfBMAdV0FwSgDSdG','student','BSIT','2026-10-21 06:10:46','2026-10-21 06:10:46','5d71ad69-2bb3-4c41-abd4-8096af40b00d'),(3,'patrick','admin@gmail.com','$2y$10$fox6G/St7yIfpUNmI2eBtu8jb1t08Vd7vLV36tSWY0D3rxbZFl6bS','admin',NULL,'2026-10-21 06:12:28','2026-10-28 11:54:19',NULL),(5,'Andre G','andre@gmail.com','$2y$10$5yLnRWRGNikmkVDWt7JSEek.XTHruU13psHawvJ1eogUUoZjw89GC','student','Information Technology','2026-10-21 06:53:14','2026-10-21 06:53:14','fef030e9-2514-4b3e-a3b1-dfaf4d6868f3'),(6,'Mandy Deadiskid','apoyawaukee8@gmail.com','$2y$10$hHKxrc0LyyHxful0sfhHhep74MBfH.Ye5oZ7M0tFHkt0jOCKAI7WG','student','Information Technology','2026-10-28 10:34:30','2026-10-28 12:44:25','40b7d78c-5985-4340-be01-fc78e7a3331e');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'tambayts_db'
--

--
-- Dumping routines for database 'tambayts_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-28 20:45:08
