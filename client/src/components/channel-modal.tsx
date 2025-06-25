import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertChannelSchema } from "@shared/schema";

const formSchema = insertChannelSchema.extend({
  channelUrl: z.string().url("유효한 URL을 입력해주세요").refine(
    (url) => url.includes("youtube.com"),
    "YouTube 채널 URL을 입력해주세요"
  ),
});

type FormData = z.infer<typeof formSchema>;

interface ChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelModal({ open, onOpenChange }: ChannelModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      channelId: "",
      channelUrl: "",
      frequency: "daily",
      isActive: true,
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/channels", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "채널이 성공적으로 추가되었습니다!" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "채널 추가 실패",
        description: error instanceof Error ? error.message : "채널을 추가하는 데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createChannelMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 채널 추가</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="channelUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>채널 URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://www.youtube.com/@channelname"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>요약 빈도</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="빈도 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">매일</SelectItem>
                      <SelectItem value="weekly">주 1회</SelectItem>
                      <SelectItem value="monthly">월 1회</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createChannelMutation.isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={createChannelMutation.isPending}>
                {createChannelMutation.isPending ? "추가 중..." : "추가"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
