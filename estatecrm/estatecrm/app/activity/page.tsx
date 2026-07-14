'use client';

import { ActivityFeed } from '@/components/activity/activity-feed';
import { Card } from '@/components/ui/card';

export default function ActivityPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Office Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Everything happening across the team, live</p>
      </div>
      <Card className="p-5">
        <ActivityFeed limit={100} />
      </Card>
    </div>
  );
}
