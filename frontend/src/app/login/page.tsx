"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { login, signup, ApiError } from "@lib/api";
import { saveToken } from "@lib/auth";

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { token } = mode === "login" ? await login(email, password) : await signup(email, password);

            saveToken(token);
            router.push("/documents");
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Something went wrong";
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow">
                <h1 className="text-xl font-semibold mb-6">{mode === "login" ? "Log in" : "Sign up"}</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border rounded px-3 py-2"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
                    >
                        {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
                    </button>
                </form>

                <button
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="text-sm text-gray-600 mt-4 underline"
                >
                    {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                </button>
            </div>
        </div>
    );
}
