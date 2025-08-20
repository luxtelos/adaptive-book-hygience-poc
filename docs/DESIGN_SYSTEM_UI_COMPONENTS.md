# Design System & UI Component Library

## 🎨 Visual Design System

### Color Palette

#### Primary Colors
```css
/* Blue - Primary brand color */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;  /* Main primary */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;
```

#### Semantic Colors
```css
/* Success - Green */
--success-50: #f0fdf4;
--success-100: #dcfce7;
--success-200: #bbf7d0;
--success-300: #86efac;
--success-400: #4ade80;
--success-500: #22c55e;  /* Main success */
--success-600: #16a34a;
--success-700: #15803d;

/* Warning - Yellow */
--warning-50: #fefce8;
--warning-100: #fef9c3;
--warning-200: #fef08a;
--warning-300: #fde047;
--warning-400: #facc15;
--warning-500: #eab308;  /* Main warning */
--warning-600: #ca8a04;
--warning-700: #a16207;

/* Error - Red */
--error-50: #fef2f2;
--error-100: #fee2e2;
--error-200: #fecaca;
--error-300: #fca5a5;
--error-400: #f87171;
--error-500: #ef4444;  /* Main error */
--error-600: #dc2626;
--error-700: #b91c1c;

/* Neutral - Gray */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### Typography System

#### Font Family
```css
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

#### Font Sizes
```css
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
--text-5xl: 3rem;       /* 48px */
```

#### Font Weights
```css
--font-thin: 100;
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

#### Line Heights
```css
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

### Spacing System
```css
/* Based on rem units (1rem = 16px) */
--space-0: 0;
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.25rem;    /* 20px */
--space-6: 1.5rem;     /* 24px */
--space-8: 2rem;       /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

### Border Radius
```css
--rounded-none: 0;
--rounded-sm: 0.125rem;    /* 2px */
--rounded: 0.25rem;        /* 4px */
--rounded-md: 0.375rem;    /* 6px */
--rounded-lg: 0.5rem;      /* 8px */
--rounded-xl: 0.75rem;     /* 12px */
--rounded-2xl: 1rem;       /* 16px */
--rounded-3xl: 1.5rem;     /* 24px */
--rounded-full: 9999px;
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

---

## 🧩 Component Library

### Core UI Components

#### Button Component
```typescript
// src/components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700",
        destructive: "bg-error-600 text-white hover:bg-error-700",
        outline: "border border-gray-300 bg-transparent hover:bg-gray-100",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "text-primary-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Usage
<Button variant="default" size="lg">
  Connect to QuickBooks
</Button>
```

#### Card Component
```typescript
// src/components/ui/card.tsx
const Card = ({ className, ...props }) => (
  <div
    className={cn(
      "rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm",
      className
    )}
    {...props}
  />
)

const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
)

const CardTitle = ({ className, ...props }) => (
  <h3
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
)

const CardContent = ({ className, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
)

// Usage
<Card>
  <CardHeader>
    <CardTitle>Financial Health Score</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your overall score is 85/100</p>
  </CardContent>
</Card>
```

#### Input Component
```typescript
// src/components/ui/input.tsx
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-gray-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})

// Usage
<Input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

#### Select Component
```typescript
// src/components/ui/select.tsx (using Radix UI)
import * as SelectPrimitive from "@radix-ui/react-select"

// Usage
<Select value={industry} onValueChange={setIndustry}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select your industry" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="retail">Retail</SelectItem>
    <SelectItem value="technology">Technology</SelectItem>
    <SelectItem value="healthcare">Healthcare</SelectItem>
    <SelectItem value="finance">Finance</SelectItem>
  </SelectContent>
</Select>
```

#### Dialog/Modal Component
```typescript
// src/components/ui/dialog.tsx (using Radix UI)
import * as DialogPrimitive from "@radix-ui/react-dialog"

// Usage
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Account Settings</DialogTitle>
      <DialogDescription>
        Make changes to your account here.
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      {/* Form content */}
    </div>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Toast/Alert Component
```typescript
// src/components/ui/toast.tsx (using Radix UI)
import * as ToastPrimitive from "@radix-ui/react-toast"

// Toast variants
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border-gray-200 bg-white text-gray-950",
        success: "border-success-200 bg-success-50 text-success-900",
        warning: "border-warning-200 bg-warning-50 text-warning-900",
        destructive: "border-error-200 bg-error-50 text-error-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Usage
toast({
  title: "Connection Successful",
  description: "Successfully connected to QuickBooks Online",
  variant: "success",
})
```

#### Progress Component
```typescript
// src/components/ui/progress.tsx (using Radix UI)
import * as ProgressPrimitive from "@radix-ui/react-progress"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-gray-100",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary-600 transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))

// Usage
<Progress value={66} className="w-full" />
```

#### Tabs Component
```typescript
// src/components/ui/tabs.tsx (using Radix UI)
import * as TabsPrimitive from "@radix-ui/react-tabs"

// Usage
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overview content */}
      </CardContent>
    </Card>
  </TabsContent>
  {/* Other tab contents */}
</Tabs>
```

---

## 🎯 Component Patterns

### Form Pattern
```typescript
// Standard form layout
<form onSubmit={handleSubmit} className="space-y-6">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      placeholder="john@example.com"
      required
    />
    <p className="text-sm text-gray-500">
      We'll never share your email with anyone else.
    </p>
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="company">Company Name</Label>
    <Input
      id="company"
      type="text"
      placeholder="Acme Corp"
      required
    />
  </div>
  
  <Button type="submit" className="w-full">
    Submit
  </Button>
</form>
```

### Loading States
```typescript
// Skeleton loader pattern
const SkeletonCard = () => (
  <Card>
    <CardHeader>
      <div className="h-4 w-[250px] bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-[200px] bg-gray-200 rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
)

// Spinner pattern
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <ReloadIcon className="h-8 w-8 animate-spin text-primary-600" />
  </div>
)
```

### Empty States
```typescript
const EmptyState = ({ title, description, action }) => (
  <div className="text-center py-12">
    <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
    {action && (
      <div className="mt-6">
        {action}
      </div>
    )}
  </div>
)

// Usage
<EmptyState
  title="No transactions found"
  description="Get started by connecting your QuickBooks account"
  action={<Button>Connect QuickBooks</Button>}
/>
```

### Error States
```typescript
const ErrorBoundary = ({ error, resetError }) => (
  <Card className="border-error-200 bg-error-50">
    <CardHeader>
      <CardTitle className="text-error-900 flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
        Something went wrong
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-error-700 mb-4">{error.message}</p>
      <Button onClick={resetError} variant="outline">
        Try again
      </Button>
    </CardContent>
  </Card>
)
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Tailwind default breakpoints */
--screen-sm: 640px;   /* Small devices */
--screen-md: 768px;   /* Medium devices */
--screen-lg: 1024px;  /* Large devices */
--screen-xl: 1280px;  /* Extra large devices */
--screen-2xl: 1536px; /* 2X large devices */
```

### Responsive Utilities
```html
<!-- Hide on mobile, show on desktop -->
<div className="hidden md:block">
  Desktop only content
</div>

<!-- Stack on mobile, grid on desktop -->
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>

<!-- Responsive padding -->
<div className="p-4 md:p-6 lg:p-8">
  {/* Content */}
</div>

<!-- Responsive text size -->
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>
```

---

## 🎨 Animation System

### Transitions
```css
/* Tailwind transition utilities */
.transition-all { transition-property: all; }
.transition-colors { transition-property: colors; }
.transition-opacity { transition-property: opacity; }
.transition-transform { transition-property: transform; }

.duration-150 { transition-duration: 150ms; }
.duration-300 { transition-duration: 300ms; }
.duration-500 { transition-duration: 500ms; }

.ease-in { transition-timing-function: ease-in; }
.ease-out { transition-timing-function: ease-out; }
.ease-in-out { transition-timing-function: ease-in-out; }
```

### Custom Animations
```css
/* Custom keyframe animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    transform: translateY(10px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Usage in Tailwind */
.animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
.animate-slideUp { animation: slideUp 0.3s ease-out; }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
```

---

## 🎭 Icons Library

### Radix Icons Usage
```typescript
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  ReloadIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  GearIcon,
  HomeIcon,
  PersonIcon,
  FileTextIcon,
  DownloadIcon,
  Link2Icon,
} from "@radix-ui/react-icons"

// Icon sizes
<CheckCircledIcon className="h-4 w-4" />  // Small
<CheckCircledIcon className="h-5 w-5" />  // Default
<CheckCircledIcon className="h-6 w-6" />  // Medium
<CheckCircledIcon className="h-8 w-8" />  // Large

// Icon colors
<CheckCircledIcon className="text-success-600" />
<CrossCircledIcon className="text-error-600" />
<ExclamationTriangleIcon className="text-warning-600" />
<InfoCircledIcon className="text-primary-600" />
```

---

## 🔧 Utility Functions

### Class Name Merger (cn)
```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "disabled-classes",
  className // Allow override from props
)} />
```

### Format Utilities
```typescript
// Date formatting
export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

// Currency formatting
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Number formatting
export const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num)
}
```

---

## 🏗️ Layout Components

### Page Layout
```typescript
const PageLayout = ({ children, title, description }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-2 text-gray-600">{description}</p>
          )}
        </div>
      </div>
    </div>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </main>
  </div>
)
```

### Container
```typescript
const Container = ({ children, className }) => (
  <div className={cn(
    "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    className
  )}>
    {children}
  </div>
)
```

### Grid System
```typescript
const Grid = ({ children, cols = 1, gap = 4, className }) => (
  <div className={cn(
    "grid",
    `grid-cols-1 md:grid-cols-${cols}`,
    `gap-${gap}`,
    className
  )}>
    {children}
  </div>
)
```

---

## 📋 Best Practices

### Component Development
1. **Always use semantic HTML elements**
2. **Ensure keyboard navigation support**
3. **Include ARIA labels for accessibility**
4. **Use Radix UI for complex interactions**
5. **Apply consistent spacing using Tailwind utilities**
6. **Implement proper focus states**
7. **Support dark mode where applicable**

### Styling Guidelines
1. **Use Tailwind utilities first**
2. **Create custom components with CVA for variants**
3. **Maintain consistent color usage through variables**
4. **Apply responsive design mobile-first**
5. **Use CSS-in-JS only when necessary**
6. **Keep animations subtle and purposeful**

### Performance Considerations
1. **Lazy load heavy components**
2. **Use React.memo for expensive renders**
3. **Implement virtual scrolling for long lists**
4. **Optimize images with next/image or lazy loading**
5. **Minimize bundle size with tree shaking**
6. **Use CSS transforms for animations**

---

*This design system documentation provides a comprehensive guide to the visual design, component library, and UI patterns used in the Financial Books Hygiene Assessment application.*