-- Apply once to existing databases to store each menu item's uploaded photo path.
ALTER TABLE menu_items
  ADD COLUMN image_url VARCHAR(255) NULL AFTER category;
