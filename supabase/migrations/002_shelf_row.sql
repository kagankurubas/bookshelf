-- Migrating the shelf system from a "fixed-capacity slot" model to a
-- "shelf grows with book count" model. To do this we add a new column
-- that tracks which shelf row each book is on; slot_index now means the
-- order WITHIN that row (no longer a global slot like before).
--
-- The libraries.capacity column is no longer used but isn't dropped, to
-- avoid data loss - the app just stops reading/writing it.

alter table books add column if not exists shelf_row integer not null default 0;
