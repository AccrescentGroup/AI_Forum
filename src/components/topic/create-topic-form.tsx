"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { MarkdownContent } from "@/components/markdown-content";
import { createTopicSchema, type CreateTopicInput } from "@/lib/validations";
import { createTopic } from "@/lib/actions";
import {
  HelpCircle,
  MessageSquare,
  Megaphone,
  Sparkles,
  Eye,
  Edit,
  Send,
  X,
} from "lucide-react";

interface CreateTopicFormProps {
  currentProduct: {
    id: string;
    slug: string;
    name: string;
    color: string | null;
  };
  products: Array<{
    id: string;
    slug: string;
    name: string;
    color: string | null;
  }>;
  categories: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string | null;
  }>;
}

const topicTypes = [
  { value: "QUESTION", label: "Question", icon: HelpCircle, description: "Ask for help or guidance" },
  { value: "DISCUSSION", label: "Discussion", icon: MessageSquare, description: "Start a conversation" },
  { value: "SHOWCASE", label: "Showcase", icon: Sparkles, description: "Share what you've built" },
  { value: "ANNOUNCEMENT", label: "Announcement", icon: Megaphone, description: "Share important news" },
] as const;

export function CreateTopicForm({
  currentProduct,
  products,
  categories,
  tags,
}: CreateTopicFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<"write" | "preview">("write");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [currentCategories, setCurrentCategories] = useState(categories);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTopicInput>({
    resolver: zodResolver(createTopicSchema),
    defaultValues: {
      productId: currentProduct.id,
      type: "QUESTION",
      tagIds: [],
    },
  });

  const selectedProductId = watch("productId");
  const bodyValue = watch("body");
  const titleValue = watch("title");
  const typeValue = watch("type");

  // Update categories when product changes
  useEffect(() => {
    const product = products.find((p) => p.id === selectedProductId);
    if (product && product.id !== currentProduct.id) {
      // Fetch categories for the new product would go here
      // For now, we'll just use the current categories
    }
  }, [selectedProductId, products, currentProduct.id]);

  // Autosave draft
  useEffect(() => {
    const draft = { title: titleValue, body: bodyValue, type: typeValue, tagIds: selectedTags };
    localStorage.setItem("topic-draft", JSON.stringify(draft));
  }, [titleValue, bodyValue, typeValue, selectedTags]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem("topic-draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.title) setValue("title", draft.title);
        if (draft.body) setValue("body", draft.body);
        if (draft.type) setValue("type", draft.type);
        if (draft.tagIds) setSelectedTags(draft.tagIds);
      } catch {
        // Ignore parse errors
      }
    }
  }, [setValue]);

  const filteredTags = tags.filter(
    (tag) =>
      !selectedTags.includes(tag.id) &&
      tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const addTag = (tagId: string) => {
    if (selectedTags.length < 5) {
      const newTags = [...selectedTags, tagId];
      setSelectedTags(newTags);
      setValue("tagIds", newTags);
      setTagSearch("");
    }
  };

  const removeTag = (tagId: string) => {
    const newTags = selectedTags.filter((id) => id !== tagId);
    setSelectedTags(newTags);
    setValue("tagIds", newTags);
  };

  const onSubmit = async (data: CreateTopicInput) => {
    setIsSubmitting(true);

    try {
      await createTopic({
        ...data,
        tagIds: selectedTags,
      });
      localStorage.removeItem("topic-draft");
      toast({ title: "Topic created successfully!" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create topic",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What kind of topic?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {topicTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = typeValue === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue("type", type.value)}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mt-0.5 ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Product & Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Where does this belong?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={selectedProductId}
                onValueChange={(value) => setValue("productId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded"
                          style={{ backgroundColor: product.color ?? "#6366f1" }}
                        />
                        {product.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Select onValueChange={(value) => setValue("categoryId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {currentCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Title</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Be specific and imagine you're asking a question to another person"
            {...register("title")}
            className="text-lg"
          />
          {errors.title && (
            <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Body */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Description</CardTitle>
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "write" | "preview")}>
              <TabsList className="h-8">
                <TabsTrigger value="write" className="text-xs gap-1 px-2">
                  <Edit className="h-3 w-3" />
                  Write
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs gap-1 px-2">
                  <Eye className="h-3 w-3" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={previewMode}>
            <TabsContent value="write" className="mt-0">
              <Textarea
                placeholder="Include all the information someone would need to answer your question. Add code examples, error messages, or screenshots if relevant."
                className="min-h-[300px] font-mono text-sm"
                {...register("body")}
              />
              {errors.body && (
                <p className="text-sm text-destructive mt-1">{errors.body.message}</p>
              )}
            </TabsContent>
            <TabsContent value="preview" className="mt-0">
              <div className="min-h-[300px] rounded-lg border bg-muted/30 p-4">
                {bodyValue ? (
                  <MarkdownContent content={bodyValue} />
                ) : (
                  <p className="text-muted-foreground italic">Nothing to preview</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-2">
            Supports Markdown formatting
          </p>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tags (up to 5)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                      style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => removeTag(tag.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Tag search */}
            <div className="relative">
              <Input
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                disabled={selectedTags.length >= 5}
              />
              {tagSearch && filteredTags.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
                  {filteredTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      {tag.color && (
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Draft saved automatically
        </p>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting ? "Creating..." : "Create Topic"}
        </Button>
      </div>
    </form>
  );
}

