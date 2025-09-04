import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import emailjs from 'emailjs-com';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  plan: z.string(),
  message: z.string().min(10, { message: 'A mensagem deve ter pelo menos 10 caracteres.' }),
});

const Support = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      plan: 'Essencial', // Assuming a default plan
      message: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // IMPORTANT: Replace with your actual EmailJS credentials
    const serviceID = 'YOUR_SERVICE_ID';
    const templateID = 'YOUR_TEMPLATE_ID';
    const userID = 'YOUR_USER_ID';

    const templateParams = {
      ...values,
      priority: 'High', // Mark ticket as priority
    };

    emailjs.send(serviceID, templateID, templateParams, userID)
      .then((response) => {
        toast.success('Ticket de suporte enviado com sucesso!');
        console.log('SUCCESS!', response.status, response.text);
        form.reset();
      })
      .catch((err) => {
        toast.error('Falha ao enviar o ticket. Tente novamente.');
        console.error('FAILED...', err);
      });
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Central de Suporte Prioritário</CardTitle>
          <CardDescription>
            Encontrou um problema ou tem alguma dúvida? Preencha o formulário abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu Plano</FormLabel>
                    <FormControl>
                      <Input disabled {...field} />
                    </FormControl>
                     <FormDescription>
                      Seu plano atual (suporte prioritário).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva seu problema ou dúvida em detalhes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Enviar Ticket</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Support;
