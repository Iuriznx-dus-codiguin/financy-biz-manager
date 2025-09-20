-- Create table for section tutorials tracking
CREATE TABLE public.section_tutorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_name TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.section_tutorials ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own section tutorials" 
ON public.section_tutorials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own section tutorials" 
ON public.section_tutorials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own section tutorials" 
ON public.section_tutorials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own section tutorials" 
ON public.section_tutorials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX idx_section_tutorials_user_section 
ON public.section_tutorials (user_id, section_name);