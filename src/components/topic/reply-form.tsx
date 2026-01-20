"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { MarkdownContent } from "@/components/markdown-content";
import { createReplySchema, type CreateReplyInput } from "@/lib/validations";
import { createReply } from "@/lib/actions";
import { Send, Eye, Edit } from "lucide-react";

interface ReplyFormProps {
  topicId: string;
  productSlug: string;
  parentId?: string;
}

export function ReplyForm({ topicId, parentId }: ReplyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<"write" | "preview">("write");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: {
      body: "",
      parentId,
    },
  });

  const bodyValue = watch("body");

  const onSubmit = async (data: CreateReplyInput) => {
    setIsSubmitting(true);

    try {
      await createReply(topicId, data);
      toast({ title: "Reply posted successfully!" });
      reset();
      setPreviewMode("write");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post reply.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Answer</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "write" | "preview")}>
            <TabsList className="mb-4">
              <TabsTrigger value="write" className="gap-2">
                <Edit className="h-4 w-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="mt-0">
              <Textarea
                placeholder="Write your answer here... (Markdown supported)"
                className="min-h-[200px] font-mono text-sm"
                {...register("body")}
              />
              {errors.body && (
                <p className="text-sm text-destructive mt-1">{errors.body.message}</p>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              <div className="min-h-[200px] rounded-lg border bg-muted/30 p-4">
                {bodyValue ? (
                  <MarkdownContent content={bodyValue} />
                ) : (
                  <p className="text-muted-foreground italic">Nothing to preview</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Supports Markdown formatting
            </p>
            <Button type="submit" disabled={isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Posting..." : "Post Reply"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

