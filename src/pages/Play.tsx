import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from "@/contexts/AuthContext";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Clock, Zap, Loader2, ArrowLeft, Trophy, Users } from "lucide-react";
import { ChessKnight } from "@/components/ChessIcon.tsx";

type GameType = "BLITZ" | "RAPID";

const Play = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSearching, setIsSearching] = useState(false);
    const [selectedType, setSelectedType] = useState<GameType | null>(null);
    const [stompClient, setStompClient] = useState<Client | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const socket = new SockJS('http://localhost:8080/ws');

        const client = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            onConnect: () => {
                console.log("Connected and Authenticated to matchmaking");
                if (user?.email) {
                    client.subscribe(`/topic/matchmaking/${user.email}`, (message) => {
                        const match = JSON.parse(message.body);
                        setIsSearching(false);
                        navigate(`/game?matchId=${match.id}`);
                    });
                }
            },
            onStompError: (frame) => {
                console.error('Broker error: ' + frame.headers['message']);
            },
        });

        client.activate();
        setStompClient(client);

        return () => {
            if (client) client.deactivate();
        };
    }, [user?.email, navigate]);

    const handleStartMatch = (gameType: GameType) => {
        if (!stompClient || !stompClient.connected) {
            alert("Connection not established. Please wait.");
            return;
        }

        setIsSearching(true);
        setSelectedType(gameType);

        stompClient.publish({
            destination: "/app/matchmaking/join",
            body: JSON.stringify({ gameType })
        });
    };

    const handleCancelSearch = () => {
        setIsSearching(false);
        setSelectedType(null);
    };

    const handleBack = () => navigate("/dashboard");

    const gameTypes = [
        {
            type: "BLITZ" as GameType,
            icon: Zap,
            title: "Blitz",
            time: "3 + 0",
            description: "Fast-paced games for quick thinking",
            gradient: "from-amber-500/20 to-orange-500/20",
            iconColor: "text-amber-500",
            borderColor: "border-amber-500/30 hover:border-amber-500/60"
        },
        {
            type: "RAPID" as GameType,
            icon: Clock,
            title: "Rapid",
            time: "10 + 0",
            description: "Balanced games with time to think",
            gradient: "from-blue-500/20 to-cyan-500/20",
            iconColor: "text-blue-500",
            borderColor: "border-blue-500/30 hover:border-blue-500/60"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
            <header className="border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChessKnight className="w-8 h-8 text-primary" />
                        <span className="text-xl font-display font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">IndiChess</span>
                    </div>
                    <Button variant="ghost" onClick={handleBack} className="hover:bg-muted/50"><ArrowLeft className="w-4 h-4 mr-2" />Dashboard</Button>
                </div>
            </header>
            <main className="container mx-auto px-6 py-16">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Choose Your Game Mode</h1>
                    </div>
                    {isSearching ? (
                        <Card className="border-primary/40 bg-gradient-to-br from-background to-muted/20 shadow-2xl">
                            <CardContent className="py-16 px-8 text-center space-y-6">
                                <Loader2 className="w-20 h-20 mx-auto text-primary animate-spin" />
                                <h2 className="text-3xl font-bold">Finding Your Opponent</h2>
                                <p className="text-muted-foreground">Searching for a {selectedType?.toLowerCase()} match...</p>
                                <Button variant="outline" onClick={handleCancelSearch}>Cancel Search</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-8">
                            {gameTypes.map((game) => (
                                <Card key={game.type} onClick={() => handleStartMatch(game.type)} className={`cursor-pointer transition-all border-2 ${game.borderColor} bg-gradient-to-br ${game.gradient} group`}>
                                    <CardHeader className="text-center">
                                        <game.icon className={`w-16 h-16 mx-auto ${game.iconColor}`} />
                                        <CardTitle className="text-3xl">{game.title}</CardTitle>
                                        <CardDescription>{game.time} minutes</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-center text-sm text-muted-foreground mb-4">{game.description}</p>
                                        <Button className="w-full">Play {game.title} <Trophy className="w-4 h-4 ml-2" /></Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Play;