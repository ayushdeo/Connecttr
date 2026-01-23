import { motion } from "framer-motion";
import { Lock, Mail, Home } from "lucide-react";
import { Button } from "./button";
import {
    Empty,
    EmptyHeader,
    EmptyTitle,
    EmptyDescription,
    EmptyContent,
    EmptyMedia,
} from "./empty";
import { Link } from "react-router-dom";

export function ForbiddenPage() {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12),transparent_70%)]">
            {/* Animated background */}
            <motion.div
                aria-hidden
                className="absolute h-80 w-80 rounded-full bg-purple-500/20 blur-3xl"
                animate={{ x: [0, 30, -30, 0], y: [0, 20, -20, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            />

            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Lock className="h-6 w-6" />
                    </EmptyMedia>

                    <EmptyTitle className="text-4xl font-bold tracking-tight">
                        Access Restricted
                    </EmptyTitle>

                    <EmptyDescription>
                        Your account doesn’t have permission to access this workspace.
                        <br />
                        Connecttr is currently invite-only.
                    </EmptyDescription>
                </EmptyHeader>

                <EmptyContent>
                    <div className="flex flex-col gap-3 w-full">
                        <Button asChild className="w-full">
                            <a href="mailto:support@connecttr.com">
                                <Mail className="mr-2 h-4 w-4" />
                                Request an Invite
                            </a>
                        </Button>

                        <Button asChild variant="outline" className="w-full">
                            <Link to="/">
                                <Home className="mr-2 h-4 w-4" />
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </EmptyContent>
            </Empty>
        </div>
    );
}
