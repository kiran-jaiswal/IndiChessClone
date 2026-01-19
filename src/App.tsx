import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreateMatch from "./pages/CreateMatch";
import Dashboard from "./pages/Dashboard";
import Play from "./pages/Play";
import ChessGame from "./pages/ChessGame";
import ChessGameAI from "./pages/ChessGameAI";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                    <Routes>
                        {/* Public */}
                        <Route path="/" element={<Index />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Protected */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* ✅ THIS ROUTE WAS MISSING */}
                        <Route
                            path="/create-match"
                            element={
                                <ProtectedRoute>
                                    <CreateMatch />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/play"
                            element={
                                <ProtectedRoute>
                                    <Play />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/game"
                            element={
                                <ProtectedRoute>
                                    <ChessGame />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/game-ai"
                            element={
                                <ProtectedRoute>
                                    <ChessGameAI />
                                </ProtectedRoute>
                            }
                        />

                        {/* Fallback */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </TooltipProvider>
        </AuthProvider>
    </QueryClientProvider>
);

export default App;
