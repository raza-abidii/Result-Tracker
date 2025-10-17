import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, Lock, Home } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "react-router-dom";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Handle email confirmation redirect
    const handleAuthStateChange = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        toast.success("Email confirmed successfully! Redirecting to admin panel...");
        setTimeout(() => {
          navigate("/admin");
        }, 2000);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          toast.success("Email confirmed successfully! Redirecting to admin panel...");
          setTimeout(() => {
            navigate("/admin");
          }, 2000);
        }
      }
    );

    handleAuthStateChange();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const makeCurrentUserAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login first");
        return;
      }

      // Check if user already has admin role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (existingRole) {
        toast.success("You already have admin privileges!");
        navigate("/admin");
        return;
      }

      // Insert admin role
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "admin"
        });

      if (error) {
        toast.error("Failed to grant admin privileges: " + error.message);
      } else {
        toast.success("Admin privileges granted successfully!");
        navigate("/admin");
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validationData = isLogin 
        ? { email, password } 
        : { email, password, fullName };
      
      authSchema.parse(validationData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // No admin check required - any authenticated user can access
          toast.success("Logged in successfully");
          navigate("/admin");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${import.meta.env.VITE_APP_URL || window.location.origin}/auth`,
          },
        });

        if (error) throw error;

        if (data.user) {
          toast.success("Account created successfully! Please check your email to confirm your account.");
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      {/* Top Navigation */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <ThemeToggle />
        <Link to="/">
          <Button variant="outline" size="sm" className="gap-2">
            <Home className="w-4 h-4" />
            Home
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Lock className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Portal</h1>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
