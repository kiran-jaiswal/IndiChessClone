import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ArrowLeft, Swords, Check, Users, Share2, Loader2 } from "lucide-react";
import { ChessKnight } from "@/components/ChessIcon.tsx";
import { matchApi } from "@/lib/api";


export default function CreateMatch() {
    const navigate = useNavigate();
    const [matchId, setMatchId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        setIsLoading(true);
        try {
            const match = await matchApi.createPrivateMatch();
            setMatchId(match.id);
        } catch (error) {
            alert("Failed to create match");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const copyId = () => {
        if (!matchId) return;
        navigator.clipboard.writeText(matchId.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleBack = () => {
        navigate("/dashboard");
    };

    const handleEnterGame = () => {
        navigate(`/game?matchId=${matchId}`);
    };

    const handleShare = () => {
        if (!matchId) return;
        const shareText = `Join my chess game! Match ID: ${matchId}`;
        if (navigator.share) {
            navigator.share({ text: shareText }).catch(() => {
                // Fallback to copy if share fails
                copyId();
            });
        } else {
            copyId();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
            {/* Header */}
            <header className="border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChessKnight className="w-8 h-8 text-primary" />
                        <span className="text-xl font-display font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            IndiChess
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        className="hover:bg-muted/50"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Dashboard
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-6 py-16">
                <div className="max-w-2xl mx-auto">
                    {/* Page Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-primary/30 mb-6">
                            <Swords className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                            Create Private Match
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                            Generate a unique match ID and invite a friend to play
                        </p>
                    </div>

                    {!matchId ? (
                        // Create Match State
                        <Card className="border-primary/40 bg-gradient-to-br from-background to-muted/20 shadow-2xl">
                            <CardContent className="py-16 px-8">
                                <div className="text-center space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-3 mb-6">
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30">
                                                <Users className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm text-blue-500 font-medium">Private Game</span>
                                            </div>
                                        </div>

                                        <h2 className="text-2xl font-display font-bold">
                                            Ready to Challenge a Friend?
                                        </h2>
                                        <p className="text-muted-foreground max-w-md mx-auto">
                                            Create a private match and share the ID with your opponent. Only players with the match ID can join.
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-center gap-4">
                                        <Button
                                            onClick={handleCreate}
                                            disabled={isLoading}
                                            size="lg"
                                            className="h-14 px-8 text-lg font-semibold min-w-[240px] shadow-lg hover:shadow-xl transition-all"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Creating Match...
                                                </>
                                            ) : (
                                                <>
                                                    <Swords className="w-5 h-5 mr-2" />
                                                    Generate Match ID
                                                </>
                                            )}
                                        </Button>

                                        {isLoading && (
                                            <p className="text-sm text-muted-foreground animate-pulse">
                                                Setting up your private match...
                                            </p>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <div className="grid md:grid-cols-3 gap-4 pt-8 border-t border-border/40">
                                        <div className="space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                                                <Users className="w-5 h-5 text-green-500" />
                                            </div>
                                            <p className="text-sm font-medium">1v1 Match</p>
                                            <p className="text-xs text-muted-foreground">Play against a specific opponent</p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                                                <Share2 className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <p className="text-sm font-medium">Easy Sharing</p>
                                            <p className="text-xs text-muted-foreground">Share ID via any platform</p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
                                                <Swords className="w-5 h-5 text-purple-500" />
                                            </div>
                                            <p className="text-sm font-medium">Instant Start</p>
                                            <p className="text-xs text-muted-foreground">Begin as soon as both join</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        // Match Created State
                        <div className="space-y-6">
                            <Card className="border-green-500/40 bg-gradient-to-br from-green-500/5 to-emerald-500/5 shadow-2xl">
                                <CardHeader className="text-center pb-4">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 mb-4 mx-auto">
                                        <Check className="w-8 h-8 text-green-500" />
                                    </div>
                                    <CardTitle className="text-3xl font-display">Match Created!</CardTitle>
                                    <CardDescription className="text-base">
                                        Share this ID with your friend to start playing
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Match ID Display */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                            Match ID
                                        </label>
                                        <div className="relative">
                                            <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm p-5 rounded-xl border-2 border-primary/30 shadow-lg">
                                                <div className="flex-1">
                                                    <span className="font-mono text-3xl font-bold tracking-wider bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                                                        {matchId}
                                                    </span>
                                                </div>
                                                <Button
                                                    size="lg"
                                                    variant={copied ? "default" : "outline"}
                                                    onClick={copyId}
                                                    className="h-12 px-6 transition-all"
                                                >
                                                    {copied ? (
                                                        <>
                                                            <Check className="w-4 h-4 mr-2" />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4 mr-2" />
                                                            Copy
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid gap-3 pt-2">
                                        <Button
                                            size="lg"
                                            className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                                            onClick={handleEnterGame}
                                        >
                                            <Swords className="w-5 h-5 mr-2" />
                                            Enter Game Room
                                        </Button>

                                        <Button
                                            size="lg"
                                            variant="outline"
                                            className="w-full h-12 text-base font-semibold"
                                            onClick={handleShare}
                                        >
                                            <Share2 className="w-4 h-4 mr-2" />
                                            Share with Friend
                                        </Button>
                                    </div>

                                    {/* Info Box */}
                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                        <div className="flex gap-3">
                                            <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-blue-500">Waiting for Opponent</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Your friend can join by entering this match ID on their dashboard. The game will start automatically once both players are ready.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Additional Options */}
                            <Card className="border-border/40 bg-muted/20">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Swords className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Create Another Match</p>
                                                <p className="text-xs text-muted-foreground">Start a new game</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setMatchId(null);
                                                setCopied(false);
                                            }}
                                        >
                                            New Match
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}