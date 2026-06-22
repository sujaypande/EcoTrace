"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Answers = {
  operational: string;
  repairable: string;
};

const initialAnswers: Answers = {
  operational: "",
  repairable: "",
};

export default function QuestionsPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [name]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/price");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-green-100 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          Device Questionnaire
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="font-medium text-gray-800">
              Is the device still operational?
            </legend>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="operational"
                value="yes"
                checked={answers.operational === "yes"}
                onChange={handleChange}
                required
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="operational"
                value="no"
                checked={answers.operational === "no"}
                onChange={handleChange}
                required
              />
              No
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-medium text-gray-800">
              Does it have minor repairable issues?
            </legend>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="repairable"
                value="yes"
                checked={answers.repairable === "yes"}
                onChange={handleChange}
                required
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="repairable"
                value="no"
                checked={answers.repairable === "no"}
                onChange={handleChange}
                required
              />
              No
            </label>
          </fieldset>

          <Button
            type="submit"
            className="w-full bg-green-600 text-white hover:bg-green-700"
          >
            Submit Answers
          </Button>
        </form>
      </section>
    </main>
  );
}
