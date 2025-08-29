-- Habilita RLS para proprietários em family_groups e cascata de exclusão para group_members

-- 1. Adicionar política RLS para permitir que os proprietários atualizem seus próprios grupos
CREATE POLICY "Proprietários podem atualizar seus próprios grupos"
ON public.family_groups
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 2. Adicionar política RLS para permitir que os proprietários excluam seus próprios grupos
CREATE POLICY "Proprietários podem excluir seus próprios grupos"
ON public.family_groups
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- 3. Adicionar ON DELETE CASCADE à chave estrangeira em group_members
-- Remove a restrição existente e a recria com a opção ON DELETE CASCADE
-- Assumindo que o nome da restrição é 'group_members_group_id_fkey', um padrão comum.
ALTER TABLE public.group_members
DROP CONSTRAINT IF EXISTS group_members_group_id_fkey,
ADD CONSTRAINT group_members_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.family_groups(id)
  ON DELETE CASCADE;
