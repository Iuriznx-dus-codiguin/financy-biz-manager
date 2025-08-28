-- Add status field to receitas table
ALTER TABLE public.receitas 
ADD COLUMN status text NOT NULL DEFAULT 'paga';

-- Add status field to despesas table  
ALTER TABLE public.despesas 
ADD COLUMN status text NOT NULL DEFAULT 'paga';

-- Add check constraints for valid status values
ALTER TABLE public.receitas 
ADD CONSTRAINT receitas_status_check 
CHECK (status IN ('paga', 'pendente'));

ALTER TABLE public.despesas 
ADD CONSTRAINT despesas_status_check 
CHECK (status IN ('paga', 'pendente'));