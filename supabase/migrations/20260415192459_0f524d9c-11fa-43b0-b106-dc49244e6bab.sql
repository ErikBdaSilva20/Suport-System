-- Fix RLS policy for tags table
DROP POLICY IF EXISTS "Agents can manage tags" ON tags;
DROP POLICY IF EXISTS "Authenticated users can read tags" ON tags;

CREATE POLICY "Authenticated users can read tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agents can manage tags"
  ON tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'agent')
        AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'agent')
        AND profiles.is_active = true
    )
  );