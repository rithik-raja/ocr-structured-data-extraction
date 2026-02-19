This is a Next.js + ShadCN dashboard.
We are building Death Certificate Intelligence:
• GPT vision
• 95% extraction accuracy across various state formats
• Structured JSON output (name, DOB, death date, SSN, address)

This is a demo dashboard for internal use, so there will be no backend integration. We will use the openai sdk with dangerouslyAllowBrowser set to true.
All shadcn components are already installed and available in components/ui. Use shadcn whenever possible and prefer using it over creating your own component.
Assume all dependencies are already installed
Upon completing a code change, run npx tsc --noEmit. If, then, you find a missing package, alert me and I will install it. Note that your current sandbox does not have internet access.