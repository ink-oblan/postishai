"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DeleteBrandButtonProps {
  brandId: string;
  onDelete?: () => void;
}

export function DeleteBrandButton({ brandId, onDelete }: DeleteBrandButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/brand-profile?id=${brandId}`, {
        method: "DELETE",
      });

      if (response.status === 404) {
        setError("Brand not found");
        return;
      }

      if (response.status === 403) {
        setError("You don't have permission to delete this brand");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete brand");
        return;
      }

      onDelete?.();
      router.refresh();
      setShowConfirm(false);
    } catch (err) {
      console.error("Error deleting brand:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowConfirm(false);
              setError(null);
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setShowConfirm(true)}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );
}
