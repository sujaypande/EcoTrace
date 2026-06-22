"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResultsData = {
  predictedDevice: string;
  wasteCategory: string;
  resellPrice: number;
  nextStep: string;
};

const defaultResults: ResultsData = {
  predictedDevice: "Unknown device",
  wasteCategory: "Pending classification",
  resellPrice: 0,
  nextStep: "Upload a clear device image and answer the questionnaire to get a more accurate result.",
};

export default function ResultsPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-green-100 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          Prediction Results
        </h1>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <span className="font-medium text-gray-900">Predicted Device:</span>{" "}
            {defaultResults.predictedDevice}
          </p>
          <p>
            <span className="font-medium text-gray-900">
              Waste Classification:
            </span>{" "}
            {defaultResults.wasteCategory}
          </p>
          <p>
            <span className="font-medium text-gray-900">
              Estimated Resell Price:
            </span>{" "}
            Rs. {defaultResults.resellPrice.toFixed(2)}
          </p>
          <p>
            <span className="font-medium text-gray-900">Next Step:</span>{" "}
            {defaultResults.nextStep}
          </p>
        </div>

        <Button
          asChild
          className="mt-6 w-full bg-green-600 text-white hover:bg-green-700"
        >
          <Link href="/upload">
            <RotateCcw className="mr-2 h-4 w-4" />
            Start Over
          </Link>
        </Button>
      </section>
    </main>
  );
}
