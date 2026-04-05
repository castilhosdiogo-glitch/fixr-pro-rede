# MEI Module Architecture Diagram

## 🏗️ Complete Module Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FIXR MEI FORMALIZATION MODULE                    │
│                         (Production Ready)                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  src/screens/FormacaoMEI/FormacaoMEIFlow.tsx (Modal Container)  ││
│  │  • Manages overall flow state                                   ││
│  │  • Routes between 4 screens                                     ││
│  │  • Handles success/close callbacks                              ││
│  └────────────────────────────────────────────────────────────────┘│
│                                    │                                 │
│              ┌─────────────────────┼─────────────────────┐           │
│              │                     │                     │           │
│    ┌─────────▼──────────┐  ┌──────▼──────────┐  ┌──────▼────────┐  │
│    │ Screen 1: Benefits │  │ Screen 2: Form  │  │ Screen 3: Tut │  │
│    │                    │  │                 │  │                │  │
│    │ • 4 benefit cards  │  │ • 5 inputs      │  │ • 6 steps      │  │
│    │ • Intro CTA        │  │ • Validation    │  │ • Gov.br link  │  │
│    │ • Icons + text     │  │ • Error msgs    │  │ • Tips section │  │
│    └────────────────────┘  └─────────────────┘  └────────────────┘  │
│                                                                      │
│            ┌──────────────────────┐                                 │
│            │ Screen 4: CNPJ Input │                                 │
│            │                      │                                 │
│            │ • CNPJ field         │                                 │
│            │ • API validation     │                                 │
│            │ • Success state      │                                 │
│            │ • Error handling     │                                 │
│            └──────────────────────┘                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
┌──────────────────────────────────▼───────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  src/hooks/useFormacaoMEI.ts                                      ││
│  │                                                                   ││
│  │  State: {                                                         ││
│  │    currentStep: 1 | 2 | 3 | 4                                    ││
│  │    personalData: { full_name, cpf, date_of_birth, cep, activity }││
│  │    cnpj: string                                                   ││
│  │    isLoading: boolean                                             ││
│  │    error: string | null                                           ││
│  │    success: boolean                                               ││
│  │    validationErrors: Record<string, string>                       ││
│  │  }                                                                ││
│  │                                                                   ││
│  │  Actions:                                                         ││
│  │  • nextStep()              • updatePersonalData()                 ││
│  │  • prevStep()              • updateAndFormatField()               ││
│  │  • updateCNPJ()            • validateAndSaveMEI()                 ││
│  │  • checkExistingMEI()      • resetFlow()                          ││
│  │                                                                   ││
│  │  Validation:                                                      ││
│  │  • isStepValid[1-4] tracking per-step status                     ││
│  │                                                                   ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
               ┌───────────────┴────────────────┐
               │                                │
┌──────────────▼──────────────────┐  ┌─────────▼─────────────────────────┐
│   VALIDATION & FORMATTING       │  │   API & DATABASE OPERATIONS       │
├─────────────────────────────────┤  ├───────────────────────────────────┤
│                                 │  │                                   │
│ src/schemas/mei-validation.ts   │  │ src/services/mei-service.ts       │
│                                 │  │                                   │
│ Zod Schemas:                    │  │ Functions:                        │
│ • MEIPersonalDataSchema         │  │ • validateCNPJWithAPI()           │
│   - full_name (5-150)           │  │   ├─ Call to Receita Federal      │
│   - cpf (formatted/11)          │  │   ├─ Check CNPJ active status     │
│   - date_of_birth (18+)         │  │   └─ Return {valid, data, error}  │
│   - cep (formatted/8)           │  │                                   │
│   - activity (3-100)            │  │ • saveMEIRegistration()           │
│                                 │  │   ├─ Insert mei_profiles row      │
│ • MEICNPJSchema                 │  │   ├─ Update profiles table        │
│   - cnpj (formatted/14)         │  │   └─ Return {success, mei, error} │
│                                 │  │                                   │
│ • MEIRegistrationSchema         │  │ • getMEIProfile()                 │
│   (Combined)                    │  │   └─ Query mei_profiles           │
│                                 │  │                                   │
│ Helper Functions:               │  │ • hasCompletedMEI()               │
│ • formatCPF()                   │  │   └─ Boolean status check         │
│ • formatCNPJ()                  │  │                                   │
│ • formatCEP()                   │  │                                   │
│ • isValidCNPJ() ← Check digit   │  │                                   │
│   algorithm                     │  │                                   │
│                                 │  │                                   │
└─────────────────────────────────┘  └───────────────────────────────────┘
                                      │
                                      │
┌─────────────────────────────────────▼────────────────────────────────┐
│                      EXTERNAL INTEGRATIONS                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────┐      ┌─────────────────────────────┐ │
│  │  RECEITA FEDERAL API       │      │  SUPABASE DATABASE          │ │
│  │                            │      │                             │ │
│  │  https://publica.cnpj.ws   │      │  Tables:                    │ │
│  │  /cnpj/{CNPJ}              │      │  • mei_profiles             │ │
│  │                            │      │  • profiles (updated)       │ │
│  │  Response:                 │      │                             │ │
│  │  {                         │      │  RLS Policies:              │ │
│  │    cnpj,                   │      │  • User owns their MEI      │ │
│  │    name,                   │      │  • Insert/update/select     │ │
│  │    status: "active|...",   │      │  • Delete cascade on user   │ │
│  │    created_at,             │      │                             │ │
│  │    updated_at              │      │  Fields:                    │ │
│  │  }                         │      │  • id (PK)                  │ │
│  │                            │      │  • user_id (FK)             │ │
│  │  Validations:              │      │  • cnpj (unique)            │ │
│  │  ✓ CNPJ format (14 digits) │      │  • full_name                │ │
│  │  ✓ CNPJ exists             │      │  • cpf                      │ │
│  │  ✓ Status is "active"      │      │  • date_of_birth            │ │
│  │                            │      │  • cep                      │ │
│  └────────────────────────────┘      │  • activity                 │ │
│                                      │  • status                   │ │
│  ┌────────────────────────────┐      │  • verified_at              │ │
│  │  REACT NATIVE LINKING      │      │  • created_at               │ │
│  │                            │      │                             │ │
│  │  Linking.openURL()         │      │  Indexes:                   │ │
│  │  └─> Opens Browser         │      │  • idx_user_id              │ │
│  │      URL: https://...      │      │  • idx_cnpj                 │ │
│  │      gov.br/empreendedor   │      │                             │ │
│  │                            │      │  Auth:                      │ │
│  └────────────────────────────┘      │  • Service role key         │ │
│                                      │  • Anon key (RLS filtered)  │ │
│                                      │                             │ │
│                                      └─────────────────────────────┘ │
│                                                                       │
└────────────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
START
  │
  ▼
┌─────────────────────┐
│ Open FormacaoMEIFlow│
│ (visible=true)      │
└──────────┬──────────┘
           │
           ▼
      ┌────────────┐
      │ Check if   │
      │ MEI        │
      │ exists?    │
      └────┬───────┘
           │
      ┌────┴────┐
      │          │
   YES          NO
      │          │
      ▼          ▼
    EXIT    SCREEN 1
   (close)   Benefits
             │
             ▼ User clicks
        SCREEN 2      "Começar"
        Personal      │
        Data Form  ←──┘
             │
             ▼
      Fill 5 fields:
      • Name
      • CPF
      • DoB
      • CEP
      • Activity
             │
             ▼
      Validate with
      MEIPersonalDataSchema
      (Zod)
             │
      ┌──────┴────────┐
      │               │
    VALID          INVALID
      │               │
      ▼               ▼
    NEXT ←────── Show errors
    BUTTON           │
      │          ┌───┘
      ▼          ▼
   SCREEN 3   (re-validate)
   Tutorial
      │
      ▼
   6 Steps +
   "Abrir gov.br"
   Button
      │
      ├─ User clicks link
      │
      ▼
   Browser opens
   https://www.gov.br
   /empresas-e-negocios
   /pt-br/empreendedor
      │
      ├─ User registers
      │  at gov.br
      │
      ├─ Gets CNPJ
      │
      ▼
   User clicks
   "Próximo"
      │
      ▼
   SCREEN 4
   CNPJ Input
      │
      ▼
   Enter CNPJ
   from gov.br
      │
      ▼
   Validate format:
   isValidCNPJ()
   (14 digits + checksum)
      │
   ┌──┴──┐
   │     │
 VALID  INVALID
   │     │
   ▼     ▼
 NEXT  Show error
 BTN    │
   │  ┌─┘
   │  ▼
   ├─(re-enter)
   │
   ▼
User clicks
"Salvar CNPJ"
   │
   ▼
Loading state
   │
   ▼
Call API:
validateCNPJWithAPI()
  │
  ├─ https://publica.cnpj.ws
  │  /cnpj/{CNPJ}
  │
  ▼
Check response:
• status 200?
• CNPJ found?
• status = "active"?
  │
┌─┴──────────┐
│             │
VALID      INVALID
│             │
▼             ▼
API        Show error
returns     message
success       │
│          Retry
├─────────────┘
│
▼
Call:
saveMEIRegistration(
  userId,
  {
    full_name,
    cpf,
    date_of_birth,
    cep,
    activity,
    cnpj
  }
)
  │
  ├─ Insert into
  │  mei_profiles
  │
  ├─ Update profiles:
  │  has_mei = true
  │  mei_cnpj = value
  │
  ▼
Success?
  │
┌─┴──────┐
│        │
YES     NO
│        │
▼        ▼
Show  Show
Success Error
State  State
│        │
│      Retry
├──────┘
│
▼
Auto-close
after 2s
  │
  ▼
Call onSuccess()
callback
  │
  ▼
Update profile UI
with MEI badge
  │
  ▼
END
```

## 🔌 Component Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│  YOUR APP (Professional Profile Screen)                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  const [meiVisible, setMeiVisible] = useState(false)           │
│                                                                │
│  <Button onPress={() => setMeiVisible(true)}>                │
│    Registrar MEI                                              │
│  </Button>                                                     │
│                                                                │
│  <FormacaoMEIFlow                                             │
│    visible={meiVisible}                                       │
│    onClose={() => setMeiVisible(false)}                       │
│    onSuccess={() => {                                         │
│      refetchProfile();  // Update profile with MEI badge      │
│    }}                                                          │
│  />                                                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
         │
         ▼ Manages
┌────────────────────────────────────────────────────────────────┐
│  FormacaoMEIFlow (Modal)                                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Uses useFormacaoMEI Hook                                 │ │
│  │ • State: currentStep, personalData, cnpj, ...           │ │
│  │ • Actions: nextStep, prevStep, updateCNPJ, ...          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Renders 1 of 4 Screens based on currentStep             │ │
│  │ • Screen1_Benefits                                       │ │
│  │ • Screen2_PersonalData                                   │ │
│  │ • Screen3_Tutorial                                       │ │
│  │ • Screen4_CNPJValidation                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Each Screen receives:                                    │ │
│  │ • Current state values                                   │ │
│  │ • Update callback functions                              │ │
│  │ • Navigation handlers (onNext, onPrev)                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
         │
         ├─────────────────────────────┬──────────────┬─────────┐
         │                             │              │         │
         ▼                             ▼              ▼         ▼
    ┌─────────┐              ┌──────────────┐  ┌────────┐  ┌───────┐
    │Validation│             │   API Calls  │  │Format  │  │Database│
    │Schemas   │             │   to Receita │  │Functions│ │Queries │
    │          │             │   Federal    │  │         │  │        │
    │mei-      │             │   and        │  │formatCPF│ │Supabase│
    │validation│             │   Supabase   │  │formatCEP│ │Client  │
    │.ts       │             │              │  │format   │  │        │
    │          │             │validateCNPJ  │  │CNPJ()   │  │        │
    │          │             │WithAPI()     │  │         │  │        │
    │          │             │             │  │         │  │        │
    │          │             │saveMEI      │  │         │  │        │
    │          │             │Registration │  │         │  │        │
    └─────────┘             └──────────────┘  └────────┘  └───────┘
```

## 🔐 Security Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                    INPUT VALIDATION LAYER                        │
├──────────────────────────────────────────────────────────────────┤
│ • Zod schema validation on all inputs                           │
│ • Real-time validation feedback to user                         │
│ • Type-safe TypeScript throughout                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                  API VALIDATION LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│ • CNPJ format validation (14 digits + check digits)             │
│ • Receita Federal API validation (active status)                │
│ • Error handling for API failures                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                DATABASE SECURITY LAYER                           │
├──────────────────────────────────────────────────────────────────┤
│ • Row-Level Security (RLS) policies                             │
│ • User can only access their own MEI profile                    │
│ • Encrypted data at rest                                        │
│ • Secure Supabase service role key                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              DATA PRIVACY & COMPLIANCE LAYER                     │
├──────────────────────────────────────────────────────────────────┤
│ ✓ LGPD Compliant (Brasil)                                       │
│ ✓ Personal data encrypted                                        │
│ ✓ No sensitive data in logs                                     │
│ ✓ Secure audit trail                                            │
│ ✓ User data deletion support                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

**Architecture Version:** 1.0  
**Last Updated:** 2026-04-05  
**Status:** ✅ Production Ready
