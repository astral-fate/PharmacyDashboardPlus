import React from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, Link } from 'wouter';
import { useUser } from '../hooks/use-user';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';

const Register = () => {
  const [, setLocation] = useLocation();
  const { register: registerUser } = useUser();
  const { toast } = useToast();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    const result = await registerUser(data);
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
        <h1 className="text-2xl font-bold text-center mb-6">WIMM Admin Register</h1>
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
          <div>
            <Input
              {...register("phone")}
              placeholder="Phone Number"
              type="tel"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Register
          </Button>
          <div className="text-center mt-4">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
              Already have an account? Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
