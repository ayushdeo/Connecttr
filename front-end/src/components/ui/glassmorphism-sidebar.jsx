
import React, { useState } from 'react';
import {
    LayoutDashboard,
    BarChart2,
    Users,
    Briefcase,
    CheckSquare,
    Hexagon
} from 'lucide-react';
import { BRAND } from '../../brand';

// 2. Sub-components (Moved UP to prevent use-before-define)
const ContentCard = ({ title, value, valueColor }) => (
    <div className="bg-slate/50 rounded-2xl p-6 border border-white/5 hover:border-royal-amethyst/30 transition-colors duration-300">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className={`text-4xl font-bold mt-2 ${valueColor}`}>{value}</p>
    </div>
);

const TaskItem = ({ text, status, statusColor }) => (
    <li className="flex justify-between items-center border-b border-white/5 last:border-0 pb-2 last:pb-0">
        <span className="text-mist">{text}</span>
        <span className={`text-xs ${statusColor} font-medium`}>{status}</span>
    </li>
);

// 3. Data (Uses ContentCard and TaskItem)
const pageContent = {
    Dashboard: {
        title: 'Dashboard',
        description: "Welcome back, Team. Here's what's happening today.",
        content: (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ContentCard title="Active Campaigns" value="12" valueColor="text-royal-amethyst" />
                <ContentCard title="Emails Sent" value="1,240" valueColor="text-soft-violet" />
                <ContentCard title="Leads Found" value="843" valueColor="text-lilac-mist" />
            </div>
        )
    },
    Analytics: {
        title: 'Analytics',
        description: 'Detailed insights and metrics for your campaigns.',
        content: (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate/50 rounded-2xl p-6 border border-white/5 lg:col-span-2 h-64 flex items-center justify-center">
                    <p className="text-soft-violet">Chart placeholder for Lead Growth</p>
                </div>
                <ContentCard title="Bounce Rate" value="2.5%" valueColor="text-royal-amethyst" />
                <ContentCard title="Response Rate" value="8.1%" valueColor="text-lilac-mist" />
            </div>
        )
    },
    Users: {
        title: 'Users',
        description: 'Manage users in your organization.',
        content: (
            <div className="bg-slate/50 rounded-2xl p-6 border border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="text-soft-violet border-b border-white/10 uppercase tracking-wider font-semibold">
                        <tr><th className="pb-4">Name</th><th className="pb-4">Email</th><th className="pb-4">Role</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-mist">
                        <tr className="group hover:bg-white/5 transition-colors"><td className="py-3">Alex Doe</td><td>alex@connecttr.com</td><td>Admin</td></tr>
                        <tr className="group hover:bg-white/5 transition-colors"><td className="py-3">Jamie Smith</td><td>jamie@connecttr.com</td><td>Analyst</td></tr>
                        <tr className="group hover:bg-white/5 transition-colors"><td className="py-3">Sam Wilson</td><td>sam@connecttr.com</td><td>Viewer</td></tr>
                    </tbody>
                </table>
            </div>
        )
    },
    Projects: {
        title: 'Projects',
        description: 'Overview of ongoing campaigns.',
        content: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate/50 rounded-2xl p-6 border border-white/5">
                    <h2 className="text-lg font-semibold text-white">Q1 Outreach</h2>
                    <p className="text-sm text-soft-violet mt-1">Status: In Progress</p>
                </div>
                <div className="bg-slate/50 rounded-2xl p-6 border border-white/5">
                    <h2 className="text-lg font-semibold text-white">Tech Hiring</h2>
                    <p className="text-sm text-soft-violet mt-1">Status: Completed</p>
                </div>
            </div>
        )
    },
    Tasks: {
        title: 'Tasks',
        description: 'Manage your to-dos.',
        content: (
            <div className="bg-slate/50 rounded-2xl p-6 border border-white/5">
                <ul className="space-y-4">
                    <TaskItem text="Finalize target list" status="Due Tomorrow" statusColor="text-royal-amethyst" />
                    <TaskItem text="Draft follow-up templates" status="In Progress" statusColor="text-soft-violet" />
                    <TaskItem text="Update CRM" status="Completed" statusColor="text-lilac-mist" />
                </ul>
            </div>
        )
    }
};

const navItems = [
    { page: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { page: 'Analytics', icon: <BarChart2 size={20} /> },
    { page: 'Users', icon: <Users size={20} /> },
    { page: 'Projects', icon: <Briefcase size={20} /> },
    { page: 'Tasks', icon: <CheckSquare size={20} /> },
];


// 4. Main Components
const Sidebar = ({ activePage, setActivePage }) => (
    <aside className="w-64 flex-shrink-0 flex flex-col z-20 bg-midnight-plum/90 backdrop-blur-md border-r border-white/10 shadow-2xl h-screen sticky top-0">
        <div className="h-20 flex items-center justify-center border-b border-white/10">
            <div className="flex items-center gap-2">
                <Hexagon className="text-royal-amethyst" fill="currentColor" fillOpacity={0.5} />
                <span className="text-xl font-bold text-white tracking-wide">{BRAND}</span>
            </div>
        </div>
        <nav className="flex-grow p-4 space-y-2">
            {navItems.map(item => (
                <button
                    key={item.page}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out font-medium
                        ${activePage === item.page
                            ? 'bg-royal-amethyst text-white shadow-lg shadow-royal-amethyst/20 scale-[1.02]'
                            : 'text-soft-violet hover:bg-white/5 hover:text-white'}`}
                    onClick={() => setActivePage(item.page)}
                >
                    {item.icon}
                    <span>{item.page}</span>
                </button>
            ))}
        </nav>
        <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-slate border border-royal-amethyst flex items-center justify-center">
                    <span className="text-white font-bold">SP</span>
                </div>
                <div>
                    <p className="font-semibold text-white text-sm">Serafim P.</p>
                    <p className="text-xs text-soft-violet">Admin</p>
                </div>
            </div>
        </div>
    </aside>
);

const MainContent = ({ activePage }) => {
    const { title, description, content } = pageContent[activePage];
    return (
        <main className="flex-grow p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">{title}</h1>
                    <p className="text-lilac-mist mt-2 text-lg opacity-80">{description}</p>
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {content}
                </div>
            </div>
        </main>
    );
};

// 5. Exported Layout
export const DashboardLayout = () => {
    const [activePage, setActivePage] = useState('Dashboard');

    // Background using brand colors (Ink base + gradients)
    return (
        <div className="relative min-h-screen w-full flex bg-ink text-mist overflow-hidden font-sans">
            {/* Background shapes/gradients to mimic "shape-1/2" functionality but with Tailwind */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-royal-amethyst rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
            <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[40%] bg-midnight-plum rounded-full blur-[100px] opacity-30 pointer-events-none"></div>

            <Sidebar activePage={activePage} setActivePage={setActivePage} />
            <MainContent activePage={activePage} />
        </div>
    );
};
