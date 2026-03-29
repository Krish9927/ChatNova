import React from "react";

function UsersLoadingSkeleton() {
    const items = Array.from({ length: 5 });

    return (
        <div className="space-y-3 p-2">
            {items.map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 animate-pulse">
                    <div className="w-12 h-12 bg-slate-700 rounded-full" />
                    <div className="flex-1">
                        <div className="h-3 bg-slate-700 rounded w-3/4 mb-2" />
                        <div className="h-2 bg-slate-700 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default UsersLoadingSkeleton;
