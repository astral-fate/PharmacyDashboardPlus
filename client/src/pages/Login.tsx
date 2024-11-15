import React from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, Link } from 'wouter';
import { useUser } from '../hooks/use-user';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';

const Login = () => {
  const [, setLocation] = useLocation();
  const { login } = useUser();
  const { toast } = useToast();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    const result = await login(data);
    if (result.ok) {
      setLocation('/');
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.message,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6">WIMM Admin Login</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              {...register("username")}
              placeholder="Username"
              type="text"
              required
            />
          </div>
          <div>
            <Input
              {...register("password")}
              placeholder="Password"
              type="password"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
          <div className="text-center mt-4">
            <Link href="/register" className="text-sm text-blue-600 hover:text-blue-800">
              Don't have an account? Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
