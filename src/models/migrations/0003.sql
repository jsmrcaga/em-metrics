-- new migration because migrations are run in parallel
CREATE INDEX idx_tickets_parent_ticket_id ON tickets (parent_ticket_id);;
