import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { GraduationCap, Search, ChevronDown, ChevronUp, User, BookOpen, Calendar, Award, Hash } from "lucide-react";

const Index = () => {
  const [hallTicket, setHallTicket] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [semesterSgpa, setSemesterSgpa] = useState<any[]>([]);
  const [studentCgpa, setStudentCgpa] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSemester, setExpandedSemester] = useState<string | null>(null);

  const searchResults = async () => {
    if (!hallTicket.trim()) {
      toast.error("Please enter a hall ticket number");
      return;
    }

    // Validate that hall ticket follows 1603XXXXXXXX format (12 digits starting with 1603)
    const hallTicketNumber = parseInt(hallTicket.trim());
    if (isNaN(hallTicketNumber) || hallTicket.trim().length !== 12 || !hallTicket.trim().startsWith('1603')) {
      toast.error("Hall ticket must be in format 1603XXXXXXXX (12 digits starting with 1603)");
      return;
    }

    setLoading(true);
    
    // Fetch detailed results
    const { data: resultsData, error: resultsError } = await supabase
      .from("results")
      .select("*")
      .eq("hall_ticket", hallTicketNumber)
      .order("semester", { ascending: true })
      .order("subject_code", { ascending: true });

    setLoading(false);

    if (resultsError) {
      toast.error("Error fetching results");
      return;
    }

    if (!resultsData || resultsData.length === 0) {
      toast.error("No results found for this hall ticket");
      setResults([]);
      setSemesterSgpa([]);
      setStudentCgpa(null);
      return;
    }

    setResults(resultsData);
    
    // Calculate semester-wise SGPA
    const semesterWiseData = calculateSemesterSgpa(resultsData);
    setSemesterSgpa(semesterWiseData);
    
    // Calculate overall CGPA
    const cgpaData = calculateOverallCgpa(resultsData);
    setStudentCgpa(cgpaData);
    
    toast.success("Results loaded successfully");
  };

  const calculateSemesterSgpa = (results: any[]) => {
    const semesterGroups = results.reduce((acc, result) => {
      const sem = result.semester;
      if (!acc[sem]) {
        acc[sem] = [];
      }
      acc[sem].push(result);
      return acc;
    }, {} as any);

    return Object.keys(semesterGroups).map(semester => {
      const subjects = semesterGroups[semester];
      const totalCredits = subjects.reduce((sum: number, sub: any) => sum + sub.credits, 0);
      const weightedGrades = subjects.reduce((sum: number, sub: any) => sum + (sub.grade_points * sub.credits), 0);
      const sgpa = totalCredits > 0 ? (weightedGrades / totalCredits).toFixed(2) : "0.00";
      const backlogs = subjects.filter((sub: any) => sub.is_backlog).length;
      
      return {
        semester,
        sgpa: parseFloat(sgpa),
        total_subjects: subjects.length,
        backlogs,
        total_credits: totalCredits,
        student_name: subjects[0].student_name
      };
    }).sort((a, b) => parseInt(a.semester) - parseInt(b.semester));
  };

  const calculateOverallCgpa = (results: any[]) => {
    const totalCredits = results.reduce((sum, result) => sum + result.credits, 0);
    const weightedGrades = results.reduce((sum, result) => sum + (result.grade_points * result.credits), 0);
    const cgpa = totalCredits > 0 ? (weightedGrades / totalCredits).toFixed(2) : "0.00";
    const totalBacklogs = results.filter(result => result.is_backlog).length;
    const completedSemesters = new Set(results.map(r => r.semester)).size;
    
    return {
      hall_ticket: results[0].hall_ticket,
      student_name: results[0].student_name,
      cgpa: parseFloat(cgpa),
      completed_semesters: completedSemesters,
      total_subjects: results.length,
      total_backlogs: totalBacklogs,
      total_credits: totalCredits
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          {/* College Logo/Symbol Section */}
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center border-2 border-primary/20 overflow-hidden">
              {/* College logo image */}
              <img 
                src="/logo.jpeg" 
                alt="College Logo" 
                className="w-20 h-20 object-cover rounded-full"
              />
            </div>
            {/* College Name - Replace with your college name */}
            <h2 className="text-2xl font-bold text-primary mb-2">Deccan College Of Engineering and Technology</h2>
            <p className="text-muted-foreground">Established in 1984 | Affiliated to University</p>
          </div>
          
          {/* Main Title Section */}
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-foreground">Examination Results Portal</h1>
          </div>
          <p className="text-muted-foreground text-lg">Search your CIE and External examination results</p>
          <div className="mt-6">
            <Link to="/auth">
              <Button variant="outline">Admin Login</Button>
            </Link>
          </div>
        </header>

        <Card className="max-w-2xl mx-auto p-8 shadow-lg">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter Hall Ticket Number (1603XXXXXXXX)"
                value={hallTicket}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 12) {
                    setHallTicket(value);
                  }
                }}
                onKeyPress={(e) => e.key === "Enter" && searchResults()}
                className="text-lg"
                maxLength={12}
              />
              <Button onClick={searchResults} disabled={loading} className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>
          </div>
        </Card>

        {results.length > 0 && studentCgpa && (
          <div className="max-w-5xl mx-auto mt-8 space-y-6">
            {/* Detailed Student Information Card */}
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-primary mb-2 flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Student Details
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-primary/20 pb-1">
                    Personal Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-semibold">{studentCgpa.student_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hall Ticket No.</p>
                        <p className="font-semibold font-mono">{studentCgpa.hall_ticket}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-primary/20 pb-1">
                    Academic Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Course</p>
                        <p className="font-semibold">{results.length > 0 ? results[0].department : "N/A"}</p>
                        <p className="text-xs text-muted-foreground">B.E</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Academic Year</p>
                        <p className="font-semibold">
                          {results.length > 0 ? results[0].academic_year : "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {studentCgpa.completed_semesters <= 2 ? "1st Year" :
                           studentCgpa.completed_semesters <= 4 ? "2nd Year" :
                           studentCgpa.completed_semesters <= 6 ? "3rd Year" : "4th Year"} - Semester {studentCgpa.completed_semesters}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Year Level</p>
                        <p className="font-semibold">
                          {studentCgpa.completed_semesters <= 2 ? "1st Year" :
                           studentCgpa.completed_semesters <= 4 ? "2nd Year" :
                           studentCgpa.completed_semesters <= 6 ? "3rd Year" : "4th Year"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Based on completed semesters
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 border-b border-primary/20 pb-1">
                    Performance Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-primary/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Overall CGPA</span>
                        <Award className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-2xl font-bold text-primary">{studentCgpa.cgpa}</p>
                      <p className="text-xs text-muted-foreground">
                        {studentCgpa.cgpa >= 9.5 ? "Outstanding (S Grade Majority)" :
                         studentCgpa.cgpa >= 8.5 ? "Excellent (A Grade Majority)" :
                         studentCgpa.cgpa >= 7.5 ? "Very Good (B Grade Majority)" :
                         studentCgpa.cgpa >= 6.5 ? "Good (C Grade Majority)" :
                         studentCgpa.cgpa >= 5.5 ? "Satisfactory (D Grade Majority)" :
                         studentCgpa.cgpa >= 5.0 ? "Average (E Grade Majority)" : "Needs Improvement"}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-lg p-3 border border-primary/10 text-center">
                        <p className="text-lg font-bold text-green-600">{studentCgpa.total_credits || 0}</p>
                        <p className="text-xs text-muted-foreground">Total Credits</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-200 text-center">
                        <p className="text-lg font-bold text-red-600">{studentCgpa.total_backlogs}</p>
                        <p className="text-xs text-muted-foreground">Backlogs</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-primary/10">
                      <p className="text-sm text-muted-foreground mb-1">Academic Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        studentCgpa.total_backlogs === 0 
                          ? 'bg-green-100 text-green-800' 
                          : studentCgpa.total_backlogs <= 2
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {studentCgpa.total_backlogs === 0 ? 'Regular' : 
                         studentCgpa.total_backlogs <= 2 ? 'Under Review' : 'Detained'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Stats Card */}
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">{studentCgpa.completed_semesters}</p>
                  <p className="text-sm text-muted-foreground">Semesters Completed</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">{semesterSgpa.length}</p>
                  <p className="text-sm text-muted-foreground">Results Available</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-blue-600">
                    {semesterSgpa.reduce((sum, sem) => sum + sem.total_subjects, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Subjects</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-purple-600">
                    {semesterSgpa.filter(sem => sem.sgpa >= 7.0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Good Semesters (≥7.0)</p>
                </div>
              </div>
            </Card>

            {/* Semester-wise Results */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Semester-wise Results</h3>
              {semesterSgpa.map((semData) => (
                <Card key={semData.semester} className="overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedSemester(
                      expandedSemester === semData.semester ? null : semData.semester
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <h4 className="text-lg font-semibold">Semester {semData.semester}</h4>
                        <div className="flex gap-4 text-sm">
                          <span className="bg-primary/10 px-3 py-1 rounded-full">
                            SGPA: <strong>{semData.sgpa}</strong>
                          </span>
                          <span className="bg-blue-50 px-3 py-1 rounded-full">
                            Subjects: <strong>{semData.total_subjects}</strong>
                          </span>
                          {semData.backlogs > 0 && (
                            <span className="bg-red-50 px-3 py-1 rounded-full text-red-600">
                              Backlogs: <strong>{semData.backlogs}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      {expandedSemester === semData.semester ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                  
                  {expandedSemester === semData.semester && (
                    <div className="border-t bg-muted/20">
                      <div className="p-4 space-y-3">
                        {results
                          .filter(result => result.semester === semData.semester)
                          .map((result) => (
                            <div key={result.id} className="bg-white rounded-lg p-4 border">
                              <div className="grid md:grid-cols-4 gap-4 items-center">
                                <div>
                                  <p className="font-semibold">{result.subject_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {result.subject_code} • {result.credits} Credits
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">CIE</p>
                                    <p className="font-semibold">{result.cie_marks}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">External</p>
                                    <p className="font-semibold">{result.external_marks}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="font-semibold">{result.total}</p>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground">Grade</p>
                                  <p className="text-lg font-bold text-primary">{result.grade}</p>
                                  <p className="text-xs">({result.grade_points})</p>
                                </div>
                                <div className="text-center">
                                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    result.is_backlog 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-primary/10 text-primary'
                                  }`}>
                                    {result.is_backlog ? 'BACKLOG' : 'PASS'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
