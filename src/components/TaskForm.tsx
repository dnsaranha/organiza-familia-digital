import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

type Task = Tables<'tasks'>;
type Group = { id: string; name: string };

interface TaskFormProps {
  task?: Task | null;
  onSave: () => void;
  onCancel: () => void;
}

export const TaskForm = ({ task, onSave, onCancel }: TaskFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    value: task?.value || 0,
    category: task?.category || "",
    scheduled_date: task?.scheduled_date ? new Date(task.scheduled_date) : new Date(),
    group_id: task?.group_id || "personal",
  });
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await (supabase as any).rpc('get_user_groups');
      if (error) {
        console.error("Error fetching groups:", error);
      } else {
        setGroups(data);
      }
    };
    fetchGroups();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const taskData = {
      ...formData,
      user_id: user.id,
      group_id: formData.group_id === "personal" ? null : formData.group_id,
      scheduled_date: formData.scheduled_date.toISOString(),
    };

    let error;
    if (task) {
      // Update existing task
      const { error: updateError } = await supabase.from("tasks").update(taskData).eq("id", task.id);
      error = updateError;
    } else {
      // Create new task
      const { error: insertError } = await supabase.from("tasks").insert(taskData);
      error = insertError;
    }

    if (error) {
      console.error("Error saving task:", error);
    } else {
      onSave();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Valor</Label>
          <Input id="value" type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Data Agendada</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.scheduled_date ? format(formData.scheduled_date, "PPP") : <span>Escolha uma data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={formData.scheduled_date} onSelect={(date) => date && setFormData({ ...formData, scheduled_date: date })} initialFocus />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label htmlFor="group">Grupo</Label>
        <Select value={formData.group_id} onValueChange={(value) => setFormData({ ...formData, group_id: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Pessoal</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
};
