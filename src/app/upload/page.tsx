"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleNext = () => {
    if (!selectedFile) {
      return;
    }

    router.push("/questions");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-green-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2 text-green-700">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Upload Device Image
            </h1>
            <p className="text-sm text-gray-600">
              Add a clear photo before answering device questions.
            </p>
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mb-4 block w-full rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-700 file:mr-4 file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-green-700"
        />

        <Button
          type="button"
          onClick={handleNext}
          disabled={!selectedFile}
          className="w-full bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </Button>
      </section>
    </main>
  );
}
