import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, LogOut, FileSpreadsheet, Database, Search, Edit2, Save, X, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import * as XLSX from "xlsx";

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchHallTicket, setSearchHallTicket] = useState("");
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [editingResult, setEditingResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    hallTicket: "",
    studentName: "",
    department: "",
    academicYear: "",
    semester: "",
    subjectCode: "",
    subjectName: "",
    credits: "",
    cieMarks: "",
    externalMarks: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    
    // Listen for auth state changes (including email verification)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          toast.success("Successfully logged in!");
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          navigate("/auth");
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setUser(session.user);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [navigate]);

  // Search for student results
  const searchStudentResults = async () => {
    if (!searchHallTicket.trim()) {
      toast.error("Please enter a hall ticket number");
      return;
    }

    const hallTicketNumber = parseInt(searchHallTicket.trim());
    if (isNaN(hallTicketNumber) || searchHallTicket.length !== 12 || !searchHallTicket.startsWith('1603')) {
      toast.error("Invalid hall ticket format. Must be 1603XXXXXXXX (12 digits)");
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .eq("hall_ticket", hallTicketNumber)
        .order("semester", { ascending: true });

      if (error) {
        toast.error("Failed to search results: " + error.message);
      } else if (data.length === 0) {
        toast.info("No results found for this hall ticket");
        setStudentResults([]);
      } else {
        setStudentResults(data);
        toast.success(`Found ${data.length} results`);
      }
    } catch (error: any) {
      toast.error("Search failed: " + error.message);
    }
    setSearchLoading(false);
  };

  // Start editing a result
  const startEditing = (result: any) => {
    setEditingResult({ ...result });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingResult(null);
  };

  // Save edited result
  const saveEditedResult = async () => {
    if (!editingResult) return;

    setLoading(true);
    try {
      // Validate the edited data
      const cieMarks = parseInt(editingResult.cie_marks);
      const externalMarks = parseInt(editingResult.external_marks);
      const credits = parseInt(editingResult.credits);

      if (isNaN(cieMarks) || isNaN(externalMarks) || cieMarks < 0 || cieMarks > 30 || 
          externalMarks < 0 || externalMarks > 70) {
        toast.error("CIE marks must be 0-30 and External marks must be 0-70");
        setLoading(false);
        return;
      }

      if (isNaN(credits) || credits < 1 || credits > 10) {
        toast.error("Credits must be between 1 and 10");
        setLoading(false);
        return;
      }

      // Calculate new result
      const total = cieMarks + externalMarks;
      const result: "PASS" | "FAIL" = total >= 40 ? "PASS" : "FAIL";

      const { error } = await supabase
        .from("results")
        .update({
          student_name: editingResult.student_name,
          department: editingResult.department,
          academic_year: editingResult.academic_year,
          semester: editingResult.semester,
          subject_code: editingResult.subject_code,
          subject_name: editingResult.subject_name,
          credits: credits,
          cie_marks: cieMarks,
          external_marks: externalMarks,
          result: result
        })
        .eq("id", editingResult.id);

      if (error) {
        toast.error("Failed to update result: " + error.message);
      } else {
        toast.success("Result updated successfully");
        setEditingResult(null);
        // Refresh the search results
        await searchStudentResults();
      }
    } catch (error: any) {
      toast.error("Update failed: " + error.message);
    }
    setLoading(false);
  };

  // Delete a result
  const deleteResult = async (resultId: string) => {
    if (!confirm("Are you sure you want to delete this result? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("results")
        .delete()
        .eq("id", resultId);

      if (error) {
        toast.error("Failed to delete result: " + error.message);
      } else {
        toast.success("Result deleted successfully");
        // Refresh the search results
        await searchStudentResults();
      }
    } catch (error: any) {
      toast.error("Delete failed: " + error.message);
    }
    setLoading(false);
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!manualEntry.hallTicket || !manualEntry.studentName || !manualEntry.department || 
        !manualEntry.academicYear || !manualEntry.semester || !manualEntry.subjectCode || 
        !manualEntry.subjectName || !manualEntry.credits || !manualEntry.cieMarks || 
        !manualEntry.externalMarks) {
      toast.error("Please fill in all fields");
      return;
    }

    const hallTicketNumber = parseInt(manualEntry.hallTicket);
    const credits = parseInt(manualEntry.credits);
    const cieMarks = parseInt(manualEntry.cieMarks);
    const externalMarks = parseInt(manualEntry.externalMarks);

    // Validate hall ticket (must follow 1603XXXXXXXX format)
    if (isNaN(hallTicketNumber) || manualEntry.hallTicket.length !== 12 || !manualEntry.hallTicket.startsWith('1603')) {
      toast.error("Hall ticket must be in format 1603XXXXXXXX (12 digits starting with 1603)");
      return;
    }

    // Validate credits
    if (isNaN(credits) || credits < 1 || credits > 10) {
      toast.error("Credits must be between 1 and 10");
      return;
    }

    // Validate marks
    if (isNaN(cieMarks) || isNaN(externalMarks) || cieMarks < 0 || cieMarks > 50 || 
        externalMarks < 0 || externalMarks > 50) {
      toast.error("Marks must be numbers between 0 and 50");
      return;
    }

    // Validate academic year format (YYYY-YYYY)
    const academicYearPattern = /^\d{4}-\d{4}$/;
    if (!academicYearPattern.test(manualEntry.academicYear)) {
      toast.error("Academic year must be in format YYYY-YYYY (e.g., 2024-2025)");
      return;
    }

    const [startYear, endYear] = manualEntry.academicYear.split('-').map(Number);
    if (endYear !== startYear + 1) {
      toast.error("End year must be exactly one year after start year");
      return;
    }

    setLoading(true);

    try {
      const total = cieMarks + externalMarks;
      const result: "PASS" | "FAIL" = total >= 40 ? "PASS" : "FAIL";

      const { error } = await supabase.from("results").insert({
        hall_ticket: hallTicketNumber,
        student_name: manualEntry.studentName,
        department: manualEntry.department,
        academic_year: manualEntry.academicYear,
        semester: manualEntry.semester as any,
        subject_code: manualEntry.subjectCode,
        subject_name: manualEntry.subjectName,
        credits: credits,
        cie_marks: cieMarks,
        external_marks: externalMarks,
        result: result
      });

      if (error) {
        toast.error("Failed to save result: " + error.message);
      } else {
        toast.success("Result saved successfully");
        // Clear the form
        setManualEntry({
          hallTicket: "",
          studentName: "",
          department: "",
          academicYear: "",
          semester: "",
          subjectCode: "",
          subjectName: "",
          credits: "",
          cieMarks: "",
          externalMarks: ""
        });
      }
    } catch (error: any) {
      toast.error("Error saving result: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("Excel file is empty");
        setUploading(false);
        return;
      }

      // Process and insert results
      const results = jsonData.map((row: any) => {
        const cieMarks = parseInt(row["CIE Marks"] || row["cie_marks"] || "0");
        const externalMarks = parseInt(row["External Marks"] || row["external_marks"] || "0");
        const credits = parseInt(row["Credits"] || row["credits"] || "3"); // Default to 3 credits
        const semester = String(row["Semester"] || row["semester"] || "1");
        const academicYear = String(row["Academic Year"] || row["academic_year"] || "2024-2025");
        const department = String(row["Department"] || row["department"] || "Computer Science Engineering");
        const total = cieMarks + externalMarks;
        const result: "PASS" | "FAIL" = total >= 40 ? "PASS" : "FAIL";

        const hallTicketValue = String(row["Hall Ticket"] || row["hall_ticket"] || "");
        const hallTicketNumber = parseInt(hallTicketValue);

        // Validate hall ticket format
        if (isNaN(hallTicketNumber) || hallTicketValue.length !== 12 || !hallTicketValue.startsWith('1603')) {
          throw new Error(`Invalid hall ticket format: ${hallTicketValue}. Must be 1603XXXXXXXX format (12 digits starting with 1603).`);
        }

        // Validate credits
        if (isNaN(credits) || credits < 1 || credits > 10) {
          throw new Error(`Invalid credits: ${credits}. Must be between 1 and 10.`);
        }

        // Validate semester
        if (!["1", "2", "3", "4", "5", "6", "7", "8"].includes(semester)) {
          throw new Error(`Invalid semester: ${semester}. Must be between 1 and 8.`);
        }

        // Validate academic year format
        const academicYearPattern = /^\d{4}-\d{4}$/;
        if (!academicYearPattern.test(academicYear)) {
          throw new Error(`Invalid academic year format: ${academicYear}. Must be YYYY-YYYY format.`);
        }

        const [startYear, endYear] = academicYear.split('-').map(Number);
        if (endYear !== startYear + 1) {
          throw new Error(`Invalid academic year: ${academicYear}. End year must be exactly one year after start year.`);
        }

        return {
          hall_ticket: hallTicketNumber,
          student_name: String(row["Name"] || row["student_name"] || ""),
          department: department,
          academic_year: academicYear,
          semester: semester as any,
          subject_code: String(row["Subject Code"] || row["subject_code"] || ""),
          subject_name: String(row["Subject Name"] || row["subject_name"] || ""),
          credits: credits,
          cie_marks: cieMarks,
          external_marks: externalMarks,
          result: result,
        };
      });

      // Validate data
      const invalidRows = results.filter(
        (r) => !r.hall_ticket || !r.student_name || !r.department || !r.academic_year || !r.subject_code || !r.subject_name
      );

      if (invalidRows.length > 0) {
        toast.error(`Found ${invalidRows.length} invalid rows. Please check your Excel file.`);
        setUploading(false);
        return;
      }

      // Insert into database
      const { error } = await supabase.from("results").insert(results);

      if (error) {
        console.error("Insert error:", error);
        toast.error("Failed to upload results: " + error.message);
      } else {
        toast.success(`Successfully uploaded ${results.length} results`);
        // Clear the file input
        e.target.value = "";
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Error processing file: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="space-y-6">
          {/* Top Row: Upload Results and Student Data Management */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Upload Results</h2>
                  <p className="text-sm text-muted-foreground">Upload Excel file with exam results</p>
                </div>
              </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select Excel File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-2"
                />
              </div>

              {uploading && (
                <p className="text-sm text-muted-foreground">Uploading and processing...</p>
              )}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Excel Format Requirements:
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Hall Ticket (Format: 1603XXXXXXXX - 12 digits starting with 1603)</li>
                <li>• Name</li>
                <li>• Department (CS, IT, EEE, ECE, Mech, CE, Civil)</li>
                <li>• Academic Year (YYYY-YYYY format, e.g., 2024-2025)</li>
                <li>• Subject Code</li>
                <li>• Subject Name</li>
                <li>• Semester (1-8)</li>
                <li>• Credits (1-10)</li>
                <li>• CIE Marks (0-50)</li>
                <li>• External Marks (0-50)</li>
              </ul>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold">Student Data Management</h2>
                <p className="text-sm text-muted-foreground">Search and edit student results</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter Hall Ticket (1603XXXXXXXX)"
                  value={searchHallTicket}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 12) {
                      setSearchHallTicket(value);
                    }
                  }}
                  maxLength={12}
                />
                <Button 
                  onClick={searchStudentResults} 
                  disabled={searchLoading}
                  className="flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {searchLoading ? "Searching..." : "Search"}
                </Button>
              </div>

              {studentResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">
                    Results for {studentResults[0].student_name} ({studentResults[0].hall_ticket})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {studentResults.map((result) => (
                      <Card key={result.id} className="p-4 border">
                        {editingResult && editingResult.id === result.id ? (
                          // Editing mode
                          <div className="space-y-3">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium">Editing - Semester {result.semester}</h4>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={saveEditedResult}
                                  disabled={loading}
                                  className="flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={cancelEditing}
                                  className="flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Student Name</Label>
                                <Input
                                  value={editingResult.student_name}
                                  onChange={(e) => setEditingResult({...editingResult, student_name: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>Department</Label>
                                <Input
                                  value={editingResult.department}
                                  onChange={(e) => setEditingResult({...editingResult, department: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>Academic Year</Label>
                                <Input
                                  value={editingResult.academic_year}
                                  onChange={(e) => setEditingResult({...editingResult, academic_year: e.target.value})}
                                  placeholder="2024-2025"
                                />
                              </div>
                              <div>
                                <Label>Subject Code</Label>
                                <Input
                                  value={editingResult.subject_code}
                                  onChange={(e) => setEditingResult({...editingResult, subject_code: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>Subject Name</Label>
                                <Input
                                  value={editingResult.subject_name}
                                  onChange={(e) => setEditingResult({...editingResult, subject_name: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>Credits (1-10)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={editingResult.credits}
                                  onChange={(e) => setEditingResult({...editingResult, credits: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>CIE Marks (0-30)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="30"
                                  value={editingResult.cie_marks}
                                  onChange={(e) => setEditingResult({...editingResult, cie_marks: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>External Marks (0-70)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="70"
                                  value={editingResult.external_marks}
                                  onChange={(e) => setEditingResult({...editingResult, external_marks: e.target.value})}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">Semester {result.semester} - {result.subject_name}</h4>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => startEditing(result)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => deleteResult(result.id)}
                                  className="flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <p><span className="font-medium">Subject Code:</span> {result.subject_code}</p>
                              <p><span className="font-medium">Credits:</span> {result.credits}</p>
                              <p><span className="font-medium">CIE:</span> {result.cie_marks}/30</p>
                              <p><span className="font-medium">External:</span> {result.external_marks}/70</p>
                              <p><span className="font-medium">Total:</span> {result.total}/100</p>
                              <p><span className="font-medium">Grade:</span> {result.grade}</p>
                              <p><span className="font-medium">Result:</span> 
                                <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                                  result.result === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {result.result}
                                </span>
                              </p>
                              <p><span className="font-medium">Academic Year:</span> {result.academic_year}</p>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
          </div>

          {/* Bottom Section: Manual Entry (Full Width) */}
          <Card className="p-6 w-full">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-8 h-8 text-secondary" />
              <div>
                <h2 className="text-xl font-bold">Manual Entry</h2>
                <p className="text-sm text-muted-foreground">Enter individual student result</p>
              </div>
            </div>

            <form onSubmit={handleManualEntry} className="space-y-6">
              {/* Student Information Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="hallTicket">Hall Ticket</Label>
                  <Input
                    id="hallTicket"
                    type="text"
                    value={manualEntry.hallTicket}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numeric input and limit to 12 characters
                      if (/^\d*$/.test(value) && value.length <= 12) {
                        setManualEntry({...manualEntry, hallTicket: value});
                      }
                    }}
                    placeholder="1603XXXXXXXX"
                    maxLength={12}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    value={manualEntry.studentName}
                    onChange={(e) => setManualEntry({...manualEntry, studentName: e.target.value})}
                    placeholder="Enter student name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Input
                    id="academicYear"
                    value={manualEntry.academicYear}
                    onChange={(e) => setManualEntry({...manualEntry, academicYear: e.target.value})}
                    placeholder="2024-2025"
                    required
                  />
                </div>
              </div>

              {/* Department and Semester Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={manualEntry.department} 
                    onValueChange={(value) => setManualEntry({...manualEntry, department: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Computer Science Engineering">Computer Science Engineering</SelectItem>
                      <SelectItem value="Information Technology">Information Technology</SelectItem>
                      <SelectItem value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</SelectItem>
                      <SelectItem value="Electronics and Communication Engineering">Electronics and Communication Engineering</SelectItem>
                      <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                      <SelectItem value="Computer Engineering">Computer Engineering</SelectItem>
                      <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Select 
                    value={manualEntry.semester} 
                    onValueChange={(value) => setManualEntry({...manualEntry, semester: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                      <SelectItem value="3">Semester 3</SelectItem>
                      <SelectItem value="4">Semester 4</SelectItem>
                      <SelectItem value="5">Semester 5</SelectItem>
                      <SelectItem value="6">Semester 6</SelectItem>
                      <SelectItem value="7">Semester 7</SelectItem>
                      <SelectItem value="8">Semester 8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject Information Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subjectCode">Subject Code</Label>
                  <Input
                    id="subjectCode"
                    value={manualEntry.subjectCode}
                    onChange={(e) => setManualEntry({...manualEntry, subjectCode: e.target.value})}
                    placeholder="CS101"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="subjectName">Subject Name</Label>
                  <Input
                    id="subjectName"
                    value={manualEntry.subjectName}
                    onChange={(e) => setManualEntry({...manualEntry, subjectName: e.target.value})}
                    placeholder="Programming Fundamentals"
                    required
                  />
                </div>
              </div>

              {/* Marks and Credits Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="credits">Credits (1-10)</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="1"
                    max="10"
                    value={manualEntry.credits}
                    onChange={(e) => setManualEntry({...manualEntry, credits: e.target.value})}
                    placeholder="4"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Input
                      id="academicYear"
                    value={manualEntry.academicYear}
                    onChange={(e) => setManualEntry({...manualEntry, academicYear: e.target.value})}
                    placeholder="2024-2025"
                    pattern="\d{4}-\d{4}"
                    title="Format: YYYY-YYYY (e.g., 2024-2025)"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1"></p>
                </div>
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Select 
                    value={manualEntry.semester} 
                    onValueChange={(value: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8") => 
                      setManualEntry({...manualEntry, semester: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                      <SelectItem value="3">Semester 3</SelectItem>
                      <SelectItem value="4">Semester 4</SelectItem>
                      <SelectItem value="5">Semester 5</SelectItem>
                      <SelectItem value="6">Semester 6</SelectItem>
                      <SelectItem value="7">Semester 7</SelectItem>
                      <SelectItem value="8">Semester 8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

              {/* Subject Information Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subjectCode">Subject Code</Label>
                  <Input
                    id="subjectCode"
                    value={manualEntry.subjectCode}
                    onChange={(e) => setManualEntry({...manualEntry, subjectCode: e.target.value})}
                    placeholder="CS101"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="subjectName">Subject Name</Label>
                  <Input
                    id="subjectName"
                    value={manualEntry.subjectName}
                    onChange={(e) => setManualEntry({...manualEntry, subjectName: e.target.value})}
                    placeholder="Programming Fundamentals"
                    required
                  />
                </div>
              </div>

              {/* Marks and Credits Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="credits">Credits (1-10)</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="1"
                    max="10"
                    value={manualEntry.credits}
                    onChange={(e) => setManualEntry({...manualEntry, credits: e.target.value})}
                    placeholder="4"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cieMarks">CIE Marks (0-30)</Label>
                  <Input
                    id="cieMarks"
                    type="number"
                    min="0"
                    max="30"
                    value={manualEntry.cieMarks}
                    onChange={(e) => setManualEntry({...manualEntry, cieMarks: e.target.value})}
                    placeholder="30"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="externalMarks">External Marks (0-70)</Label>
                  <Input
                    id="externalMarks"
                    type="number"
                    min="0"
                    max="70"
                    value={manualEntry.externalMarks}
                    onChange={(e) => setManualEntry({...manualEntry, externalMarks: e.target.value})}
                    placeholder="70"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Result"}
              </Button>
            </form>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Pass/Fail Criteria:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Total marks ≥ 40</li>
                <li>• CIE marks ≥ 20</li>
                <li>• External marks ≥ 20</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
