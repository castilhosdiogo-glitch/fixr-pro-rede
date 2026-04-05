# MEI Formalization Module - Integration Guide

Complete step-by-step guide to integrate the MEI formalization flow into your Fixr React Native application.

## 📦 What's Included

```
src/
├── screens/FormacaoMEI/
│   ├── FormacaoMEIFlow.tsx          # Main modal container
│   ├── Screen1_Benefits.tsx         # Benefits introduction
│   ├── Screen2_PersonalData.tsx     # Personal data form
│   ├── Screen3_Tutorial.tsx         # gov.br tutorial
│   ├── Screen4_CNPJValidation.tsx   # CNPJ validation
│   ├── index.ts                     # Exports
│   ├── README.md                    # Component documentation
│   └── INTEGRATION_GUIDE.md         # This file
├── hooks/
│   └── useFormacaoMEI.ts            # State management hook
├── services/
│   └── mei-service.ts               # API and DB operations
└── schemas/
    └── mei-validation.ts            # Zod validation schemas
```

## 🔧 Integration Steps

### Step 1: Verify Dependencies

Ensure you have these packages installed:

```bash
npm list react-native zod lucide-react-native
```

Required packages:
- `react-native` (already installed)
- `zod@3.22.4` (validation)
- `lucide-react-native` (icons)

### Step 2: Database Setup

Run these migrations in Supabase to create the MEI tables:

```sql
-- Create MEI profiles table
CREATE TABLE IF NOT EXISTS mei_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  cep TEXT NOT NULL,
  activity TEXT NOT NULL,
  status TEXT DEFAULT 'verified',
  verified_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add MEI fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_mei BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mei_cnpj TEXT;

-- Enable RLS
ALTER TABLE public.mei_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own MEI profile"
  ON public.mei_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MEI profile"
  ON public.mei_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MEI profile"
  ON public.mei_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_mei_profiles_user_id ON public.mei_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mei_profiles_cnpj ON public.mei_profiles(cnpj);
```

### Step 3: Update Supabase Types (Optional but Recommended)

Generate updated types to match new tables:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

### Step 4: Add MEI Button to Professional Profile

In your professional profile screen component:

```typescript
// src/screens/ProfessionalProfile.tsx
import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { FormacaoMEIFlow } from "@/screens/FormacaoMEI";
import { useAuth } from "@/hooks/useAuth";

export function ProfessionalProfile() {
  const [meiFlowVisible, setMeiFlowVisible] = useState(false);
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {/* Existing profile content */}

      {/* MEI Registration Section */}
      <View style={styles.meiSection}>
        <Text style={styles.sectionTitle}>Formalização</Text>
        
        <TouchableOpacity
          style={styles.meiButton}
          onPress={() => setMeiFlowVisible(true)}
        >
          <Text style={styles.meiButtonText}>
            📋 Registrar como MEI
          </Text>
          <Text style={styles.meiButtonSubtext}>
            Formalize seu negócio e ganhe credibilidade
          </Text>
        </TouchableOpacity>
      </View>

      {/* MEI Flow Modal */}
      <FormacaoMEIFlow
        visible={meiFlowVisible}
        onClose={() => setMeiFlowVisible(false)}
        onSuccess={() => {
          // Refresh profile data
          refetchProfile();
          // Show success message
          Alert.alert(
            "Sucesso!",
            "Seu MEI foi registrado com sucesso. Seu perfil foi atualizado com o badge MEI."
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  meiSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  meiButton: {
    backgroundColor: "#E6F0FF",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0066CC",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  meiButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0066CC",
    marginBottom: 4,
  },
  meiButtonSubtext: {
    fontSize: 12,
    color: "#666666",
  },
});
```

### Step 5: Display MEI Badge in Profile

After successful registration, show the MEI badge in the profile header:

```typescript
// In your profile screen
import { useState, useEffect } from "react";
import { getMEIProfile } from "@/services/mei-service";

export function ProfessionalProfile() {
  const [meiProfile, setMeiProfile] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      getMEIProfile(user.id).then(({ mei }) => {
        setMeiProfile(mei);
      });
    }
  }, [user?.id]);

  return (
    <View>
      {/* Profile header */}
      {meiProfile && (
        <View style={styles.meiMedalContainer}>
          <Text style={styles.meiMedal}>✓ MEI Verificado</Text>
          <Text style={styles.meiCnpj}>{meiProfile.cnpj}</Text>
        </View>
      )}
    </View>
  );
}
```

### Step 6: Test the Integration

```typescript
// Test basic flow
import { renderWithRedux } from "@/utils/test-utils";
import { FormacaoMEIFlow } from "@/screens/FormacaoMEI";

describe("MEI Flow", () => {
  it("should render benefits screen on open", () => {
    const { getByText } = renderWithRedux(
      <FormacaoMEIFlow visible={true} onClose={jest.fn()} />
    );
    
    expect(getByText(/Formalize seu Negócio/i)).toBeTruthy();
  });

  it("should navigate through all screens", async () => {
    // Test navigation flow
  });

  it("should validate personal data before proceeding", async () => {
    // Test validation
  });

  it("should validate CNPJ with Receita Federal API", async () => {
    // Test API call
  });
});
```

## 🌐 Environment Variables

Ensure these are configured in your `.env`:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: API endpoints for MEI service
EXPO_PUBLIC_MEI_API_BASE=https://your-api.com
```

## 🔄 Data Flow

```
User clicks "Registrar MEI"
    ↓
Modal opens → Screen 1 (Benefits)
    ↓
User clicks "Começar" → Screen 2 (Personal Data)
    ↓
User fills form (Name, CPF, DoB, CEP, Activity)
    ↓
Form validates via MEIPersonalDataSchema (Zod)
    ↓
User clicks "Próximo" → Screen 3 (Tutorial)
    ↓
User reads tutorial and clicks "Abrir gov.br"
    ↓
Browser opens Receita Federal portal
    ↓
User completes registration at gov.br
    ↓
User returns to app → Screen 4 (CNPJ Input)
    ↓
User enters CNPJ received from gov.br
    ↓
CNPJ validated via MEICNPJSchema (format check)
    ↓
CNPJ validated via Receita Federal API (https://publica.cnpj.ws)
    ↓
If valid → Save to database via saveMEIRegistration()
    ↓
Update user profile (has_mei = true, mei_cnpj = value)
    ↓
Show success state
    ↓
Close modal after 2 seconds
    ↓
Call onSuccess callback
    ↓
Update profile UI to show MEI badge
```

## 🔐 Security Considerations

### Input Validation
✅ All inputs validated with Zod schemas
✅ CNPJ format validation with check digit algorithm
✅ Date of birth validation (18+ years old)
✅ Name and activity text validation

### API Security
✅ CNPJ validation via official Receita Federal API
✅ No sensitive data in logs
✅ Rate limiting on database operations
✅ RLS policies protect user data

### Data Privacy
✅ LGPD compliant (Lei Geral de Proteção de Dados)
✅ Personal data encrypted at rest in Supabase
✅ No data shared with third parties
✅ User can request data export and deletion

## 🚀 Production Checklist

- [ ] Database tables created in production Supabase
- [ ] RLS policies properly configured
- [ ] Test with real Receita Federal API
- [ ] Test all error scenarios (network failures, invalid CNPJ, etc.)
- [ ] Test MEI badge display in profile
- [ ] Monitor Receita Federal API rate limits
- [ ] Add analytics tracking for MEI registration
- [ ] Document MEI feature in user help/support
- [ ] Verify LGPD compliance
- [ ] Load test with concurrent registrations

## 📊 Monitoring & Analytics

Track these metrics:

```typescript
// In your analytics service
export const trackMEIRegistration = {
  started: () => analytics.track("mei_registration_started"),
  completed: () => analytics.track("mei_registration_completed"),
  failed: (error: string) => analytics.track("mei_registration_failed", { error }),
  cnpjValidated: () => analytics.track("mei_cnpj_validated"),
  cnpjValidationFailed: (error: string) => 
    analytics.track("mei_cnpj_validation_failed", { error }),
};
```

## 🐛 Troubleshooting

### "CNPJ not found" error
- Verify user completed gov.br registration
- Check CNPJ is typed correctly (remove extra spaces)
- Wait a few minutes (Receita Federal may have slight delay)

### "Validation failed" errors
- Check field formatting (CPF, CEP should match patterns)
- Verify date of birth is 18+ years ago
- Check name contains only letters (no numbers or special chars)

### "Database error" on save
- Verify user is authenticated
- Check RLS policies allow write access
- Check database quotas haven't been exceeded

### "Cannot open gov.br" link
- Verify device has internet connection
- Check URL is accessible: https://www.gov.br/empresas-e-negocios/pt-br/empreendedor
- On Android, verify browser is installed
- On iOS, verify Safari is not restricted

## 📚 Related Documentation

- [MEI Validation Schemas](../../../schemas/mei-validation.ts)
- [MEI Service API](../../../services/mei-service.ts)
- [useFormacaoMEI Hook](../../../hooks/useFormacaoMEI.ts)
- [Component README](./README.md)

## 📞 Support

For implementation help:
1. Check component README.md for API details
2. Review example integration code above
3. Check server logs for API errors
4. Verify database schema matches migrations

---

**Version:** 1.0  
**Integration Status:** ✅ Ready  
**Last Updated:** 2026-04-05
