import React from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Card } from '../components/ui/card';
import { 
  Pill, 
  Building2, 
  AlertTriangle,
  TrendingUp,
  Package
} from 'lucide-react';
import useSWR from 'swr';
import type { Medicine, Pharmacy, Inventory } from 'db/schema';

const Dashboard = () => {
  const { data: medicines } = useSWR<Medicine[]>('/api/medicines');
  const { data: pharmacies } = useSWR<Pharmacy[]>('/api/pharmacies');
  const { data: inventoryItems } = useSWR<Inventory[]>('/api/inventory');

  const stats = [
    { 
      label: 'Total Medicines', 
      value: medicines?.length || 0, 
      icon: Pill, 
      color: 'blue' 
    },
    { 
      label: 'Active Pharmacies', 
      value: pharmacies?.length || 0, 
      icon: Building2, 
      color: 'green' 
    },
    { 
      label: 'Low Stock Alerts', 
      value: inventoryItems?.filter(item => item.quantity < item.minQuantity).length || 0,
      icon: AlertTriangle, 
      color: 'red' 
    },
    { 
      label: 'Total Inventory Items', 
      value: inventoryItems?.length || 0,
      icon: Package, 
      color: 'purple' 
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <TopBar />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, index) => (
              <Card key={index} className="p-6">
                <div className={`text-${stat.color}-600 mb-2`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <h3 className="text-gray-500 text-sm">{stat.label}</h3>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
