# Exam Track - College Examination Results Management System

## 🎯 Overview

Exam Track is a modern web application for managing college examination results with secure authentication, semester-wise grading, and real-time data management. Built with React, TypeScript, and Supabase for Deccan College of Engineering and Technology.

## ✨ Key Features

### 🔐 Authentication & Security
- **Secure Authentication**: User registration and login system
- **Role-Based Access Control**: Separate admin and student interfaces
- **Session Management**: Secure session handling with automatic logout
- **Row Level Security**: Database-level security policies

### 📊 Student Features
- **Result Search**: Search results by hall ticket number (Format: 1603XXXXXXXX where X are digits)
- **Comprehensive Student Details**: View personal, academic, and performance information
- **Semester-wise Results**: Organized display of results by semester
- **SGPA/CGPA Calculations**: Automatic calculation of semester and cumulative GPAs
- **Performance Analytics**: Visual representation of academic performance
- **Backlog Tracking**: Monitor failed subjects and retakes

### 👨‍💼 Administrative Features
- **Manual Entry**: Add individual student results through intuitive forms
- **Excel Upload**: Bulk upload results via Excel files
- **Data Validation**: Comprehensive validation for all inputs
- **Real-time Updates**: Immediate reflection of changes in student portal

### 📈 Academic Management
- **Academic Year Tracking**: Year-wise result organization (YYYY-YYYY format)
- **Semester System**: Support for 8-semester engineering programs
- **Credit System**: Flexible credit assignment (1-10 credits per subject)
- **Grading System**: Standard 10-point grading scale (O to F)
- **Backlog Management**: Automatic identification and tracking of failed subjects

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1**: Modern UI library with hooks and functional components
- **TypeScript**: Type-safe development with enhanced IDE support
- **Vite**: Lightning-fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **shadcn/ui**: High-quality, accessible UI components
- **Lucide React**: Beautiful, customizable icons

### Backend & Database
- **Supabase**: Backend-as-a-Service with PostgreSQL database
- **PostgreSQL**: Robust relational database with advanced features
- **Row Level Security (RLS)**: Database-level security policies
- **Real-time Subscriptions**: Live data updates

### Additional Libraries
- **React Router DOM**: Client-side routing and navigation
- **Sonner**: Beautiful toast notifications
- **XLSX**: Excel file processing for bulk uploads
- **Zod**: Runtime type validation and form validation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn package manager
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/raza-abidii/exam-track.git
   cd exam-track
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   Run the migration files in your Supabase SQL editor:
   ```bash
   # Apply migrations in order
   supabase/migrations/semester_wise_results.sql
   supabase/migrations/add_academic_year.sql
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open `http://localhost:5173` in your browser
   - Student Portal: Main interface for students
   - Admin Panel: Access via `/admin` route

## 📋 Database Schema

### Results Table
```sql
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_ticket BIGINT NOT NULL CHECK (hall_ticket >= 100000000000 AND hall_ticket <= 999999999999),
  student_name VARCHAR(100) NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  semester semester NOT NULL,
  subject_code VARCHAR(20) NOT NULL,
  subject_name VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0 AND credits <= 10),
  cie_marks INTEGER NOT NULL CHECK (cie_marks >= 0 AND cie_marks <= 50),
  external_marks INTEGER NOT NULL CHECK (external_marks >= 0 AND external_marks <= 50),
  total INTEGER GENERATED ALWAYS AS (cie_marks + external_marks) STORED,
  grade VARCHAR(2) GENERATED ALWAYS AS (...) STORED,
  grade_points DECIMAL(3,1) GENERATED ALWAYS AS (...) STORED,
  result result_status NOT NULL,
  is_backlog BOOLEAN GENERATED ALWAYS AS (...) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Constraints
- **Hall Ticket**: Format 1603XXXXXXXX (12 digits total, starting with 1603, followed by 8 digits)
- **Academic Year**: YYYY-YYYY format (e.g., 2024-2025)
- **Marks**: CIE and External marks between 0-50
- **Credits**: Between 1-10 per subject
- **Semester**: Values 1-8

## 📊 Grading System

### Grade Scale
| Percentage Range | Grade Letter | Grade Points |
|------------------|--------------|--------------|
| ≥ 85 to 100      | S            | 10           |
| ≥ 70 to < 85     | A            | 9            |
| ≥ 60 to < 70     | B            | 8            |
| ≥ 55 to < 60     | C            | 7            |
| ≥ 50 to < 55     | D            | 6            |
| ≥ 40 to < 50     | E            | 5            |
| < 40             | F            | 0            |
| Absent           | Ab           | 0            |

*Pass criteria: Total marks ≥ 40

### SGPA/CGPA Calculation
- **SGPA**: (Total Grade Points × Credits) / Total Credits per semester
- **CGPA**: (Total SGPA × Credits) / Total Credits across all semesters

## 📤 Excel Upload Format

### Required Columns
| Column Name | Description | Format | Example |
|-------------|-------------|---------|---------|
| Hall Ticket | Student ID | 12 digits | 123456789012 |
| Name | Student name | Text | John Doe |
| Academic Year | Academic year | YYYY-YYYY | 2024-2025 |
| Subject Code | Subject code | Text | CS101 |
| Subject Name | Subject name | Text | Programming |
| Semester | Semester number | 1-8 | 3 |
| Credits | Subject credits | 1-10 | 4 |
| CIE Marks | Internal marks | 0-50 | 45 |
| External Marks | External marks | 0-50 | 42 |

### Sample Excel Data
```
Hall Ticket   | Name      | Academic Year | Subject Code | Subject Name      | Semester | Credits | CIE Marks | External Marks
123456789012  | John Doe  | 2024-2025    | CS101        | Programming       | 1        | 4       | 45        | 42
123456789013  | Jane Doe  | 2024-2025    | CS101        | Programming       | 1        | 4       | 40        | 38
```

### Alternative Column Names (also supported):
- `hall_ticket` instead of `Hall Ticket`
- `student_name` instead of `Name`
- `academic_year` instead of `Academic Year`
- `subject_code` instead of `Subject Code`
- `subject_name` instead of `Subject Name`
- `cie_marks` instead of `CIE Marks`
- `external_marks` instead of `External Marks`

## 📁 Project Structure

```
exam-track/
├── public/                      # Static assets
├── src/
│   ├── components/             # Reusable UI components
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   ├── integrations/
│   │   └── supabase/         # Supabase configuration and types
│   ├── lib/                  # Utility functions
│   ├── pages/                # Main application pages
│   │   ├── Admin.tsx         # Administrator interface
│   │   ├── Auth.tsx          # Authentication page
│   │   ├── Index.tsx         # Student result search
│   │   └── NotFound.tsx      # 404 error page
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── supabase/
│   └── migrations/           # Database migration files
├── package.json              # Dependencies and scripts
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite configuration
```

## 🎨 User Interface

### Design Principles
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Accessibility**: ARIA labels and keyboard navigation
- **Dark Green Theme**: College branding colors (#006400)
- **Clean Typography**: Easy-to-read fonts and spacing
- **Intuitive Navigation**: Clear user flow and breadcrumbs

### Key Pages
1. **Home/Search Page**: Public result search functionality
2. **Admin Panel**: Administrative interface for result management
3. **Authentication Pages**: Login and registration forms

## 🔐 Authentication System

### Student Authentication
1. **Registration**: Students register with email and password
2. **Email Verification**: Verification email sent to provided address
3. **Login**: Secure login with email and password
4. **Session Management**: Automatic session handling and logout

### Admin Authentication
- Admin accounts are created manually in Supabase
- Role-based access through `user_roles` table
- Protected admin routes with role verification

## 🔍 API Endpoints (Supabase)

### Student Operations
- `GET /results` - Fetch student results by hall ticket
- `GET /student_cgpa_view` - Get SGPA/CGPA calculations
- `GET /semester_sgpa_view` - Get semester-wise SGPA

### Admin Operations
- `POST /results` - Create new result entries
- `PUT /results` - Update existing results
- `DELETE /results` - Remove result entries

## 🧪 Testing

### Manual Testing Checklist
- [ ] Student registration and authentication
- [ ] Result search functionality
- [ ] SGPA/CGPA calculations
- [ ] Excel file upload
- [ ] Admin manual entry
- [ ] Data validation
- [ ] Responsive design
- [ ] Authentication flow

## 🚀 Deployment

### Supabase Deployment
1. Create Supabase project
2. Configure authentication settings
3. Apply database migrations
4. Set up Row Level Security policies
5. Configure email templates

### Frontend Deployment (Netlify/Vercel)
1. Build the project: `npm run build`
2. Deploy dist folder to hosting platform
3. Configure environment variables
4. Set up custom domain (optional)

### Environment Setup
```bash
# Production environment variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📈 Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Lazy loading of routes
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: Compressed assets
- **Caching**: Browser caching strategies

### Database Optimizations
- **Indexing**: Strategic database indexes
- **Query Optimization**: Efficient SQL queries
- **Connection Pooling**: Supabase connection management

## 🔒 Security Features

### Data Protection
- **Row Level Security**: Database-level access control
- **Input Validation**: Server and client-side validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Email Verification**: Verified email addresses
- **Session Management**: Secure session handling
- **Password Security**: Encrypted password storage

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check Supabase URL and key
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
```

#### Authentication Problems
- Check email verification status
- Ensure user roles are properly assigned
- Verify Supabase authentication settings

#### Excel Upload Errors
- Verify column headers match exactly
- Check data format requirements
- Ensure hall ticket is 12 digits
- Validate academic year format (YYYY-YYYY)

#### Performance Issues
- Check database indexes
- Optimize query patterns
- Monitor Supabase quotas

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: [Your contact information]
- Documentation: [Link to detailed docs]

## 🙏 Acknowledgments

- Deccan College of Engineering and Technology
- React and TypeScript communities
- Supabase team
- shadcn/ui components
- Tailwind CSS framework

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Maintained by**: Raza Abidi
