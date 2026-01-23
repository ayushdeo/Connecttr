import { motion } from "framer-motion";
import { Ghost, Home, Search, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function NotFoundPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-neutral-200 selection:bg-rose-500/30">

            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-rose-900/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center z-10 max-w-2xl px-6"
            >
                {/* Abstract 404 Glitch Effect */}
                <div className="relative font-bold text-[8rem] sm:text-[10rem] leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-neutral-200 to-neutral-600 select-none">
                    <span>4</span>
                    <span className="inline-block relative">
                        <motion.div
                            animate={{
                                rotate: [0, 10, -10, 0],
                                x: [0, 5, -5, 0]
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 5,
                                ease: "easeInOut"
                            }}
                        >
                            0
                        </motion.div>
                        <motion.div
                            className="absolute top-0 left-0 w-full h-full text-rose-500 opacity-30 mix-blend-screen blur-sm"
                            animate={{
                                x: [0, -4, 4, 0],
                                opacity: [0.3, 0.5, 0.3]
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 0.2,
                                repeatDelay: 3
                            }}
                        >
                            0
                        </motion.div>
                    </span>
                    <span>4</span>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-6 mt-2"
                >
                    <div className="flex items-center justify-center gap-2 text-rose-400 font-medium">
                        <AlertCircle size={18} />
                        <span className="uppercase tracking-widest text-xs">Error Code: Not Found</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-100">
                        Lost in the Void?
                    </h2>

                    <p className="text-neutral-400 text-lg max-w-md mx-auto leading-relaxed">
                        The signal you're looking for has drifted into deep space.
                        The page doesn't exist or has been moved to another frequency.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                        {user ? (
                            <>
                                <Link
                                    to="/"
                                    className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-900 rounded-full font-semibold hover:bg-white hover:scale-105 transition-all w-full sm:w-auto justify-center"
                                >
                                    <Home size={18} />
                                    <span>Go Home</span>
                                </Link>

                                <Link
                                    to="/campaigns"
                                    className="flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-full font-medium hover:bg-neutral-800 hover:text-white transition-all w-full sm:w-auto justify-center"
                                >
                                    <Search size={18} />
                                    <span>Explore Campaigns</span>
                                </Link>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-full font-semibold hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-900/20 transition-all w-full sm:w-auto justify-center"
                            >
                                <ArrowLeft size={18} />
                                <span>Sign In to Reconnect</span>
                            </Link>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* Footer / Decorative */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-10 left-0 w-full text-center text-neutral-600 text-xs tracking-widest uppercase opacity-50"
            >
                Connecttr Systems // Status: Offline
            </motion.div>
        </div>
    );
}
