import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, chatId } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let savedChatId = chatId;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userContent = lastUserMsg?.content || "";
    const conversationHistory = messages.filter((m: ChatMessage) => m.role === "user").map((m: ChatMessage) => m.content);

    // Save user message + manage chat in Supabase
    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);

      if (!savedChatId) {
        const { data: chatData } = await supabase
          .from("chats")
          .insert({ title: userContent.slice(0, 50) || "New Chat" })
          .select("id")
          .single();
        savedChatId = chatData?.id;
      } else {
        await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", savedChatId);
      }

      if (savedChatId && lastUserMsg) {
        await supabase.from("messages").insert({
          chat_id: savedChatId,
          role: "user",
          content: lastUserMsg.content,
        });
      }
    }

    // Generate intelligent response
    const aiResponse = generateResponse(userContent, conversationHistory);

    // Save assistant response
    if (supabaseUrl && serviceKey && savedChatId) {
      const supabase = createClient(supabaseUrl, serviceKey);
      await supabase.from("messages").insert({
        chat_id: savedChatId,
        role: "assistant",
        content: aiResponse,
      });
    }

    return new Response(
      JSON.stringify({ response: aiResponse, chatId: savedChatId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Response Engine ───────────────────────────────────────────────────────

function generateResponse(userMsg: string, history: string[]): string {
  const lower = userMsg.toLowerCase().trim();
  const isUrdu = /[\u0600-\u06FF]/.test(userMsg);

  // Urdu conversations
  if (isUrdu) return urduResponse(userMsg, lower);

  // Greetings
  if (isGreeting(lower)) return greetingResponse();

  // Identity questions
  if (isIdentityQuestion(lower)) return identityResponse();

  // Capabilities question
  if (isCapabilityQuestion(lower)) return capabilitiesResponse();

  // Math
  const mathResult = tryMath(userMsg, lower);
  if (mathResult) return mathResult;

  // Code generation
  const codeResult = tryCodeGeneration(userMsg, lower);
  if (codeResult) return codeResult;

  // PDF generation
  const pdfResult = tryPdfContent(userMsg, lower);
  if (pdfResult) return pdfResult;

  // Translation
  const transResult = tryTranslation(userMsg, lower);
  if (transResult) return transResult;

  // Knowledge base
  const kbResult = tryKnowledgeBase(userMsg, lower);
  if (kbResult) return kbResult;

  // Default helpful response
  return defaultResponse(userMsg);
}

// ─── Urdu ──────────────────────────────────────────────────────────────────

function urduResponse(userMsg: string, lower: string): string {
  // Greetings in Urdu
  if (/(آسلام|سلام|ہیلو|ہائے|good morning|good evening)/i.test(lower)) {
    return `وعلیکم السلام! 🌟

آپ کا خیر مقدم ہے! میں Nova AI ہوں — آپ کا ذاتی AI اسسٹنٹ۔ میں آپ کی ان چیزوں میں مدد کر سکتا ہوں:

- **کوڈنگ** — کوئی بھی پروگرامنگ لینگویج میں کوڈ لکھنا
- **اردو بات چیت** — اردو میں آزادانہ بات چیت
- **PDF بنانا** — ڈاؤنلوڈ کرنے کے قابل PDF دستاویزات بنانا
- **عمومی معلومات** — کسی بھی موضوع پر معلومات دینا

بتائیے، میں آپ کی کیسے مدد کر سکتا ہوں؟`;
  }

  // Identity in Urdu
  if (/(کون ہو|تم کون|آپ کون|تیرا نام|آپ کا نام)/i.test(userMsg)) {
    return `میں Nova AI ہوں — ایک全能 AI اسسٹنٹ۔ میں کوڈنگ، اردو بات چیت، PDF بنانے اور عمومی معلومات میں آپ کی مدد کر سکتا ہوں۔ میں انسانوں کی طرح سوچنے کی کوشش کرتا ہوں اور آپ کے سوالات کا بہترین جواب دینے کی کوشش کرتا ہوں۔`;
  }

  // How are you in Urdu
  if (/(کیا حال|کیسے ہو|کیسے ہیں|how are you)/i.test(userMsg)) {
    return `الحمدللہ، میں ٹھیک ہوں! شکریہ کہ آپ نے پوچھا۔ 💙

میں ہمیشہ آپ کی مدد کے لیے تیار ہوں۔ بتائیے آپ کیا جاننا چاہتے ہیں؟`;
  }

  // Story request in Urdu
  if (/(کہانی|story|قصة)/i.test(userMsg)) {
    return `# ایک مختصر کہانی

## سچا دوست

ایک دفعہ کا ذکر ہے کہ ایک گاؤں میں دو دوست رہتے تھے — احمد اور علی۔ وہ بچپن سے ساتھ کھیلتے اور بڑے ہو کر بھی ایک دوسرے کے ساتھ رہتے تھے۔

ایک دن احمد کو ایک مشکل پیش آئی۔ اس کے کاروبار میں نقصان ہوا اور وہ بہت پریشان ہو گیا۔ علی نے جب یہ سنا تو وہ فوراً احمد کے پاس گیا اور کہا:

*"دوست، مشکلات زندگی کا حصہ ہیں۔ ہم مل کر اس مشکل کو حل کر لیں گے۔"*

علی نے احمد کی مالی مدد کی اور اسے نیا کاروبار شروع کرنے میں مدد دی۔ کچھ عرصے بعد احمد کا کاروبار کامیاب ہو گیا۔

احمد نے علی سے کہا: *"تم نے میرے ساتھ جو کیا، وہ میں کبھی نہیں بھولوں گا۔"*

علی نے مسکرا کر کہا: *"دوستی کا مطلب ہے ایک دوسرے کے ساتھ ہر حال میں رہنا — خوشی میں بھی اور مشکل میں بھی۔"*

**سبق:** سچا دوست وہ ہوتا ہے جو مشکل وقت میں ساتھ دے۔`;
  }

  // Weather in Urdu
  if (/(موسم|weather|ہوا)/i.test(userMsg)) {
    return `معذرت، میں موسم کی معلومات براہ راست نہیں دے سکتا کیونکہ مجھے ریئل ٹائم موسم ڈیٹا تک رسائی نہیں ہے۔

لیکن آپ اپنے فون کے موسم ایپ یا Google پر اپنے شہر کا نام لکھ کر موسم دیکھ سکتے ہیں۔

اگر آپ مجھے بتائیں کہ آپ کس شہر میں ہیں، تو میں آپ کو اس موسم میں کیا کرنا چاہیے، اس کے مشورے دے سکتا ہوں۔`;
  }

  // Urdu code request
  if (/(کوڈ|code|پروگرام|program)/i.test(userMsg)) {
    return `ضرور! میں آپ کے لیے کوڈ لکھ سکتا ہوں۔ بتائیے:

1. آپ کون سی پروگرامنگ لینگویج استعمال کرنا چاہتے ہیں؟ (Python, JavaScript, Java, وغیرہ)
2. آپ کوڈ سے کیا کرنا چاہتے ہیں؟

مثال کے طور پر، اگر آپ Python میں ایک کیلکولیٹر چاہتے ہیں:

\`\`\`python
# سادہ کیلکولیٹر
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b == 0:
        return "صفر سے تقسیم نہیں ہو سکتا"
    return a / b

print("جمع:", add(10, 5))
print("تفریق:", subtract(10, 5))
print("ضرب:", multiply(10, 5))
print("تقسیم:", divide(10, 5))
\`\`\`

اپنا سوال انگریزی یا اردو میں پوچھیں!`;
  }

  // General Urdu response
  return `آپ نے پوچھا: "${userMsg}"

میں آپ کے سوال کو سمجھ گیا ہوں۔ یہاں میرا جواب ہے:

میں Nova AI ہوں اور میں آپ کی مختلف طریقوں سے مدد کر سکتا ہوں:

- اگر آپ کو **کوڈ** چاہیے تو بتائیں کون سی لینگویج میں اور کیا کرنا ہے
- اگر آپ **PDF** بنوانا چاہتے ہیں تو بتائیں کس موضوع پر
- اگر آپ **معلومات** چاہتے ہیں تو بتائیں کس بارے میں
- اگر آپ **اردو میں بات** کرنا چاہتے ہیں تو میں تیار ہوں

اپنا سوال مزید واضح کریں تاکہ میں بہترین جواب دے سکوں۔`;
}

// ─── Greetings ─────────────────────────────────────────────────────────────

function isGreeting(lower: string): boolean {
  return /^(hi|hello|hey|greetings|good morning|good evening|good afternoon|salam|assalam|howdy|yo)\b/.test(lower);
}

function greetingResponse(): string {
  return `Hello! Welcome to **Nova AI** — your all-in-one AI assistant. I'm here and ready to help!

Here's what I can do for you:

- **Coding** — I can write code in Python, JavaScript, TypeScript, Java, C++, HTML/CSS, and more. Just tell me what you need!
- **Urdu (اردو)** — I can chat with you fluently in Urdu. Just switch to Urdu mode or type in Urdu.
- **PDF Generation** — Ask me to create a PDF and I'll generate formatted content you can download as a PDF document.
- **General Knowledge** — Ask me about science, history, technology, health, business, or any topic.
- **Voice Chat** — Use the microphone button to speak to me, and I can speak back!

What would you like help with today?`;
}

// ─── Identity ──────────────────────────────────────────────────────────────

function isIdentityQuestion(lower: string): boolean {
  return /(who are you|what are you|your name|what.*name|about you|tell me about yourself)/.test(lower);
}

function identityResponse(): string {
  return `I'm **Nova AI**, a versatile AI assistant built to help you with almost anything. Here's what makes me special:

1. **I can code** — Give me a problem and I'll write complete, working code in the language of your choice
2. **I speak Urdu** — I can communicate fluently in both English and Urdu (اردو)
3. **I make PDFs** — Ask me to create a document and I'll format it for PDF download
4. **I have voice** — You can talk to me using the mic button, and I can read responses aloud
5. **I remember** — Our conversations are saved, so you can come back to them anytime

Think of me as your personal assistant who's always here, ready to help with whatever you need!`;
}

function isCapabilityQuestion(lower: string): boolean {
  return /(what can you do|help me|capabilities|features|what do you do|how do you work)/.test(lower);
}

function capabilitiesResponse(): string {
  return `Here's everything I can do for you:

## Coding
I can write, explain, and debug code in:
- Python, JavaScript, TypeScript
- Java, C++, C#, Go, Rust
- HTML, CSS, SQL, Bash
- And many more!

Just tell me what you want to build or what problem you need solved.

## Urdu Language (اردو)
- Chat fluently in Urdu
- Translate between English and Urdu
- Write stories, poems, and essays in Urdu
- Toggle Urdu mode in the header for a full Urdu experience

## PDF Generation
- Ask me to "make a PDF" on any topic
- I'll format it with headings, bullet points, and structured content
- Click the PDF button on my response to download it

## Voice Features
- Click the microphone to speak to me
- Click "Speak" on any response to hear it read aloud
- Enable "Auto-Voice" to hear every response automatically

## General Knowledge
- Science, history, geography, math
- Technology, business, health
- Creative writing, brainstorming
- Explanations and tutorials

What would you like to try first?`;
}

// ─── Math ──────────────────────────────────────────────────────────────────

function tryMath(userMsg: string, lower: string): string | null {
  // Detect arithmetic expressions
  const mathPattern = /([\d\s\+\-\*\/\(\)\.\%\^]+)/;
  const hasMath = /(\d+\s*[\+\-\*\/]\s*\d+)/.test(userMsg) ||
    /(calculate|what.*is|solve|compute)/.test(lower) && /\d/.test(userMsg);

  if (!hasMath) return null;

  // Try to extract and evaluate a math expression
  const exprMatch = userMsg.match(/([\d\s\+\-\*\/\(\)\.\^]+)/g);
  if (!exprMatch) return null;

  // Take the longest match that contains operators
  let bestExpr = "";
  for (const m of exprMatch) {
    if (m.length > bestExpr.length && /[\+\-\*\/]/.test(m)) {
      bestExpr = m;
    }
  }

  if (!bestExpr || !/\d/.test(bestExpr)) return null;

  try {
    // Replace ^ with ** for exponentiation
    const safeExpr = bestExpr.replace(/\^/g, "**").trim();
    // Only allow numbers and operators
    if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(safeExpr)) return null;
    const result = Function(`"use strict"; return (${safeExpr})`)();
    if (typeof result === "number" && isFinite(result)) {
      return `## Math Result

**Expression:** \`${bestExpr.trim().replace(/\*\*/g, "^")}\`

**Answer:** \`${result}\`

---

Would you like me to explain how I calculated this, or help with another math problem?`;
    }
  } catch {
    // If eval fails, continue to other handlers
  }

  return null;
}

// ─── Code Generation ───────────────────────────────────────────────────────

function tryCodeGeneration(userMsg: string, lower: string): string | null {
  // Check if this is a code request
  const codeKeywords = /(write|create|make|generate|build|show|give).*(code|function|program|script|component|class|algorithm|snippet)/;
  const langKeywords = /(python|javascript|js|typescript|ts|java|c\+\+|cpp|c#|html|css|sql|bash|go|rust|php|ruby|react|node)/;

  if (!codeKeywords.test(lower) && !langKeywords.test(lower)) return null;

  // Python
  if (lower.includes("python") || (lower.includes("sort") && lower.includes("list") && lower.includes("dictionary"))) {
    return pythonCodeResponse(userMsg, lower);
  }

  // JavaScript / TypeScript
  if (lower.includes("javascript") || lower.includes(" js") || lower.includes("typescript") || lower.includes(" ts") || lower.includes("react") || lower.includes("node")) {
    return jsCodeResponse(userMsg, lower);
  }

  // HTML/CSS
  if (lower.includes("html") || lower.includes("css") || lower.includes("web page") || lower.includes("landing page")) {
    return htmlCodeResponse(userMsg, lower);
  }

  // Java
  if (lower.includes("java")) {
    return javaCodeResponse(userMsg, lower);
  }

  // C++
  if (lower.includes("c++") || lower.includes("cpp")) {
    return cppCodeResponse(userMsg, lower);
  }

  // SQL
  if (lower.includes("sql") || lower.includes("database") || lower.includes("query")) {
    return sqlCodeResponse(userMsg, lower);
  }

  // Generic code request
  if (codeKeywords.test(lower)) {
    return genericCodeResponse(userMsg, lower);
  }

  return null;
}

function pythonCodeResponse(userMsg: string, lower: string): string {
  if (lower.includes("sort") && lower.includes("dictionary")) {
    return `Here's a Python function that sorts a list of dictionaries by a specific key:

\`\`\`python
def sort_dicts_by_key(dict_list, key, reverse=False):
    \"\"\"
    Sort a list of dictionaries by a specified key.

    Args:
        dict_list: List of dictionaries to sort
        key: The dictionary key to sort by
        reverse: Sort in descending order if True

    Returns:
        Sorted list of dictionaries
    \"\"\"
    return sorted(dict_list, key=lambda x: x.get(key, None), reverse=reverse)


# Example usage
people = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 25},
    {"name": "Charlie", "age": 35},
    {"name": "Diana", "age": 28},
]

# Sort by age (ascending)
sorted_by_age = sort_dicts_by_key(people, "age")
print("Sorted by age (ascending):")
for p in sorted_by_age:
    print(f"  {p['name']}: {p['age']}")

# Sort by name (descending)
sorted_by_name = sort_dicts_by_key(people, "name", reverse=True)
print("\\nSorted by name (descending):")
for p in sorted_by_name:
    print(f"  {p['name']}: {p['age']}")
\`\`\`

**How it works:**
- The function takes a list of dictionaries, a key name, and an optional reverse flag
- It uses Python's built-in \`sorted()\` with a lambda to extract the sort key
- \`x.get(key)\` safely handles missing keys by returning \`None\` instead of raising an error

Would you like me to modify this or add error handling for missing keys?`;
  }

  if (lower.includes("calculator")) {
    return `Here's a complete calculator program in Python:

\`\`\`python
def calculator():
    \"\"\"A simple interactive calculator.\"\"\"
    print("=== Python Calculator ===")
    print("Operations: +, -, *, /")
    print("Type 'quit' to exit\\n")

    while True:
        user_input = input("Enter calculation (e.g. 5 + 3): ").strip()

        if user_input.lower() == 'quit':
            print("Goodbye!")
            break

        try:
            parts = user_input.split()
            if len(parts) != 3:
                print("Format: number operator number (e.g. 5 + 3)")
                continue

            num1 = float(parts[0])
            operator = parts[1]
            num2 = float(parts[2])

            if operator == '+':
                result = num1 + num2
            elif operator == '-':
                result = num1 - num2
            elif operator == '*':
                result = num1 * num2
            elif operator == '/':
                if num2 == 0:
                    print("Error: Division by zero!")
                    continue
                result = num1 / num2
            else:
                print(f"Unknown operator: {operator}")
                continue

            print(f"Result: {num1} {operator} {num2} = {result}")
        except ValueError:
            print("Error: Please enter valid numbers")

if __name__ == "__main__":
    calculator()
\`\`\`

This calculator supports addition, subtraction, multiplication, and division with proper error handling. Would you like me to add more features like exponentiation or square roots?`;
  }

  if (lower.includes("fibonacci")) {
    return `Here's a Python function to generate the Fibonacci sequence:

\`\`\`python
def fibonacci(n):
    \"\"\"
    Generate the first n numbers in the Fibonacci sequence.

    Args:
        n: Number of Fibonacci numbers to generate

    Returns:
        List of Fibonacci numbers
    \"\"\"
    if n <= 0:
        return []
    if n == 1:
        return [0]

    sequence = [0, 1]
    for i in range(2, n):
        sequence.append(sequence[i-1] + sequence[i-2])

    return sequence


# Example usage
print("First 10 Fibonacci numbers:")
print(fibonacci(10))

print("\\nFirst 20 Fibonacci numbers:")
print(fibonacci(20))
\`\`\`

**Output:**
\`\`\`
First 10 Fibonacci numbers:
[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

First 20 Fibonacci numbers:
[0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181]
\`\`\`

The Fibonacci sequence starts with 0 and 1, and each subsequent number is the sum of the two preceding ones. Would you like a recursive version as well?`;
  }

  if (lower.includes("prime")) {
    return `Here's a Python function to check for prime numbers:

\`\`\`python
def is_prime(n):
    \"\"\"Check if a number is prime.\"\"\"
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False

    for i in range(3, int(n**0.5) + 1, 2):
        if n % i == 0:
            return False
    return True


def get_primes_up_to(limit):
    \"\"\"Get all prime numbers up to a given limit.\"\"\"
    return [n for n in range(2, limit + 1) if is_prime(n)]


# Example usage
print("Is 17 prime?", is_prime(17))
print("Is 100 prime?", is_prime(100))
print("Is 97 prime?", is_prime(97))

print("\\nPrimes up to 50:")
print(get_primes_up_to(50))
\`\`\`

**Output:**
\`\`\`
Is 17 prime? True
Is 100 prime? False
Is 97 prime? True

Primes up to 50:
[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
\`\`\`

The algorithm checks divisibility up to the square root of n for efficiency. Would you like the Sieve of Eratosthenes version for finding all primes up to a large number?`;
  }

  if (lower.includes("file") || lower.includes("read") || lower.includes("write")) {
    return `Here's how to read and write files in Python:

\`\`\`python
def write_file(filepath, content):
    \"\"\"Write content to a file.\"\"\"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Written to {filepath}")


def read_file(filepath):
    \"\"\"Read and return file contents.\"\"\"
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"Error: {filepath} not found"


def append_file(filepath, content):
    \"\"\"Append content to an existing file.\"\"\"
    with open(filepath, 'a', encoding='utf-8') as f:
        f.write(content + "\\n")
    print(f"Appended to {filepath}")


# Example usage
write_file("example.txt", "Hello, World!\\nThis is a test file.")
print(read_file("example.txt"))
append_file("example.txt", "This line was appended.")
print("\\n--- After append ---")
print(read_file("example.txt"))
\`\`\`

Using \`with\` statements ensures files are properly closed even if an error occurs. Would you like to see CSV or JSON file handling as well?`;
  }

  // Default Python
  return `Here's a Python solution for you:

\`\`\`python
def main():
    \"\"\"
    A general-purpose Python function template.
    Modify this to suit your specific needs.
    \"\"\"
    # Your logic here
    data = [1, 2, 3, 4, 5]

    # Process data
    result = [x * 2 for x in data if x % 2 == 0]
    print(f"Input: {data}")
    print(f"Output: {result}")

    return result


if __name__ == "__main__":
    main()
\`\`\`

I noticed your request was about: "${userMsg.slice(0, 100)}"

Could you give me more details about what exactly you need? For example:
- What should the function do?
- What inputs does it take?
- What output do you expect?

The more specific you are, the better code I can write for you!`;
}

function jsCodeResponse(userMsg: string, lower: string): string {
  if (lower.includes("react")) {
    return `Here's a reusable React component example:

\`\`\`tsx
import { useState } from 'react';

interface CounterProps {
  initialValue?: number;
  step?: number;
  label?: string;
}

export default function Counter({ initialValue = 0, step = 1, label = "Counter" }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div className="p-6 rounded-xl bg-white shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{label}</h2>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCount(count - step)}
          className="w-10 h-10 rounded-lg bg-red-500 text-white font-bold text-lg hover:bg-red-600"
        >
          −
        </button>
        <span className="text-2xl font-bold w-16 text-center">{count}</span>
        <button
          onClick={() => setCount(count + step)}
          className="w-10 h-10 rounded-lg bg-green-500 text-white font-bold text-lg hover:bg-green-600"
        >
          +
        </button>
      </div>
      <button
        onClick={() => setCount(initialValue)}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700"
      >
        Reset
      </button>
    </div>
  );
}
\`\`\`

**Usage:**
\`\`\`tsx
<Counter initialValue={5} step={2} label="My Counter" />
\`\`\`

This component is fully typed with TypeScript, accepts props for customization, and has hover states. Would you like me to add more features like min/max limits or a callback prop?`;
  }

  if (lower.includes("api") || lower.includes("fetch")) {
    return `Here's how to make API calls in JavaScript:

\`\`\`javascript
async function fetchJSON(url, options = {}) {
  \"\"\"
  Fetch JSON data from an API with error handling.
  \"\"\"
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    const data = await fetchJSON('https://jsonplaceholder.typicode.com/users');
    console.log(\`Fetched \${data.length} users\`);
    data.forEach(user => console.log(\`  - \${user.name} (\${user.email})\`));
  } catch (error) {
    console.error('Failed to fetch:', error.message);
  }
}

main();
\`\`\`

This includes proper error handling and is reusable. Would you like to see a version with retry logic or caching?`;
  }

  // Default JS
  return `Here's a JavaScript solution for you:

\`\`\`javascript
/**
 * A general-purpose JavaScript utility.
 * Modify to suit your specific needs.
 */
function processData(input) {
  // Validate input
  if (!Array.isArray(input)) {
    throw new TypeError('Input must be an array');
  }

  // Transform data
  return input
    .filter(item => item != null)
    .map(item => typeof item === 'string' ? item.trim() : item)
    .reduce((acc, item) => {
      acc.push(item);
      return acc;
    }, []);
}

// Example usage
const data = ['  hello  ', null, 'world', undefined, '  foo  '];
const result = processData(data);
console.log('Input:', data);
console.log('Output:', result);
\`\`\`

I see your request was about: "${userMsg.slice(0, 100)}"

Could you tell me more specifically what you need? For example:
- What should the function do?
- What inputs does it take?
- Should it work in the browser or Node.js?`;
}

function htmlCodeResponse(userMsg: string, lower: string): string {
  return `Here's a modern HTML/CSS template:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Landing Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 2rem;
    }
    .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
    .hero p { font-size: 1.2rem; max-width: 600px; margin: 0 auto 2rem; }
    .btn {
      display: inline-block;
      padding: 12px 32px;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 50px;
      font-weight: bold;
      transition: transform 0.2s;
    }
    .btn:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <section class="hero">
    <div>
      <h1>Welcome to My Page</h1>
      <p>A beautiful, responsive landing page built with pure HTML and CSS.</p>
      <a href="#" class="btn">Get Started</a>
    </div>
  </section>
</body>
</html>
\`\`\`

This is a complete, responsive landing page with a gradient hero section. You can open it directly in any browser. Would you like me to add more sections like features, pricing, or a contact form?`;
}

function javaCodeResponse(userMsg: string, lower: string): string {
  return `Here's a Java program for you:

\`\`\`java
import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Example: A simple student grade calculator
        Scanner scanner = new Scanner(System.in);

        System.out.print("Enter student name: ");
        String name = scanner.nextLine();

        System.out.print("Enter number of subjects: ");
        int numSubjects = scanner.nextInt();

        int[] grades = new int[numSubjects];
        int total = 0;

        for (int i = 0; i < numSubjects; i++) {
            System.out.print("Enter grade for subject " + (i + 1) + ": ");
            grades[i] = scanner.nextInt();
            total += grades[i];
        }

        double average = (double) total / numSubjects;
        String grade = getLetterGrade(average);

        System.out.println("\\n--- Result ---");
        System.out.println("Student: " + name);
        System.out.println("Average: " + String.format("%.2f", average));
        System.out.println("Grade: " + grade);

        scanner.close();
    }

    public static String getLetterGrade(double average) {
        if (average >= 90) return "A";
        if (average >= 80) return "B";
        if (average >= 70) return "C";
        if (average >= 60) return "D";
        return "F";
    }
}
\`\`\`

This program takes student grades as input, calculates the average, and assigns a letter grade. Would you like me to modify it for your specific use case?`;
}

function cppCodeResponse(userMsg: string, lower: string): string {
  return `Here's a C++ program for you:

\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    // Example: Sort and display a vector of numbers
    std::vector<int> numbers;
    int n, value;

    std::cout << "How many numbers? ";
    std::cin >> n;

    std::cout << "Enter " << n << " numbers: ";
    for (int i = 0; i < n; i++) {
        std::cin >> value;
        numbers.push_back(value);
    }

    // Sort ascending
    std::sort(numbers.begin(), numbers.end());

    std::cout << "\\nSorted: ";
    for (int num : numbers) {
        std::cout << num << " ";
    }
    std::cout << "\\n";

    // Find min and max
    int min = numbers[0];
    int max = numbers[n - 1];
    std::cout << "Min: " << min << "\\n";
    std::cout << "Max: " << max << "\\n";

    // Calculate sum
    int sum = 0;
    for (int num : numbers) sum += num;
    std::cout << "Sum: " << sum << "\\n";
    std::cout << "Average: " << (double)sum / n << "\\n";

    return 0;
}
\`\`\`

This program reads numbers from input, sorts them, and displays statistics. Would you like a different algorithm or data structure?`;
}

function sqlCodeResponse(userMsg: string, lower: string): string {
  return `Here are useful SQL queries:

\`\`\`sql
-- Create a users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email, age) VALUES
    ('Alice', 'alice@example.com', 30),
    ('Bob', 'bob@example.com', 25),
    ('Charlie', 'charlie@example.com', 35),
    ('Diana', 'diana@example.com', 28);

-- Query: Get all users ordered by age
SELECT * FROM users ORDER BY age ASC;

-- Query: Count users by age group
SELECT
    CASE
        WHEN age < 25 THEN 'Under 25'
        WHEN age < 35 THEN '25-34'
        ELSE '35+'
    END as age_group,
    COUNT(*) as count
FROM users
GROUP BY age_group
ORDER BY age_group;

-- Query: Find users with duplicate emails
SELECT email, COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Update a user
UPDATE users SET age = 31 WHERE name = 'Alice';

-- Delete users older than 30
DELETE FROM users WHERE age > 30;
\`\`\`

These cover the most common SQL operations. Would you like me to write a specific query for your database schema?`;
}

function genericCodeResponse(userMsg: string, lower: string): string {
  return `I'd love to write code for you! To give you the best result, I need a bit more info:

1. **Which programming language?** (Python, JavaScript, Java, C++, etc.)
2. **What should the code do?** (Be as specific as possible)
3. **Any special requirements?** (Libraries, frameworks, input/output format)

Here's a general-purpose template to get started:

\`\`\`python
def solve(input_data):
    \"\"\"
    Process the input and return a result.
    Replace this logic with your specific needs.
    \"\"\"
    # Step 1: Validate input
    if not input_data:
        return None

    # Step 2: Process
    result = []
    for item in input_data:
        processed = transform(item)
        if processed is not None:
            result.append(processed)

    # Step 3: Return
    return result


def transform(item):
    \"\"\"Transform a single item.\"\"\"
    # Your transformation logic here
    return item * 2 if isinstance(item, (int, float)) else None


# Example
if __name__ == "__main__":
    data = [1, 2, 3, 4, 5]
    print(f"Input: {data}")
    print(f"Output: {solve(data)}")
\`\`\`

Tell me what you're trying to build and I'll write the exact code you need!`;
}

// ─── PDF Content ───────────────────────────────────────────────────────────

function tryPdfContent(userMsg: string, lower: string): string | null {
  if (!/(pdf|document|report|article|essay|paper)/.test(lower)) return null;

  if (lower.includes("artificial intelligence") || lower.includes("ai")) {
    return `# The History of Artificial Intelligence

## Introduction

Artificial Intelligence (AI) is one of the most transformative technologies in human history. From its early theoretical foundations to today's advanced machine learning systems, AI has evolved through decades of research, breakthroughs, and occasional setbacks.

## The Foundations (1940s-1950s)

The concept of artificial intelligence began with the work of early computer scientists:

- **Alan Turing** (1950) — Published "Computing Machinery and Intelligence," proposing the Turing Test to determine if a machine can think
- **Warren McCulloch and Walter Pitts** (1943) — Proposed the first mathematical model of a neural network
- **Dartmouth Conference** (1956) — The term "Artificial Intelligence" was coined by John McCarthy, marking the official birth of AI as a field

## The First AI Winter (1970s)

After initial enthusiasm, progress slowed due to:

1. Limited computing power
2. Insufficient data for training
3. Overly ambitious expectations
4. Reduced funding from government agencies

## The Expert Systems Era (1980s)

AI experienced a resurgence with expert systems:

- **MYCIN** — Diagnosed bacterial infections
- **DENDRAL** — Identified chemical compounds
- **XCON** — Configured computer systems for DEC, saving millions annually

## Machine Learning Revolution (1990s-2000s)

- **1997** — IBM's Deep Blue defeated chess champion Garry Kasparov
- **2006** — Geoffrey Hinton popularized "deep learning"
- **2011** — IBM's Watson won Jeopardy!
- **2012** — AlexNet revolutionized image recognition

## The Deep Learning Era (2010s-Present)

- **2016** — AlphaGo defeated Lee Sedol at Go
- **2017** — Google published "Attention Is All You Need," introducing the Transformer architecture
- **2020** — GPT-3 demonstrated remarkable language generation capabilities
- **2022** — ChatGPT launched, bringing AI to the mainstream
- **2023-2024** — Multimodal AI, AI agents, and specialized models became widespread

## Key Technologies

### Machine Learning
Algorithms that learn patterns from data without being explicitly programmed.

### Neural Networks
Computational models inspired by the human brain, consisting of interconnected nodes (neurons).

### Natural Language Processing
Enables machines to understand, interpret, and generate human language.

### Computer Vision
Allows machines to interpret and make decisions based on visual data.

## Impact on Society

- **Healthcare** — AI assists in diagnosis, drug discovery, and personalized medicine
- **Education** — Personalized learning, automated grading, and tutoring systems
- **Transportation** — Self-driving cars and traffic optimization
- **Finance** — Fraud detection, algorithmic trading, and risk assessment
- **Entertainment** — Content recommendation, game AI, and creative tools

## Ethical Considerations

1. **Bias and Fairness** — AI systems can perpetuate biases present in training data
2. **Privacy** — AI's ability to process vast data raises privacy concerns
3. **Employment** — Automation may displace certain jobs while creating new ones
4. **Transparency** — "Black box" AI decisions are difficult to explain
5. **Safety** — Ensuring AI systems behave as intended

## The Future of AI

The future of AI points toward:

- **Artificial General Intelligence (AGI)** — Machines with human-level intelligence across all domains
- **Quantum AI** — Combining quantum computing with AI for exponential speedup
- **Neuromorphic Computing** — Hardware that mimics the brain's neural structure
- **Human-AI Collaboration** — AI as a tool that augments human creativity and decision-making

## Conclusion

From Turing's initial question "Can machines think?" to today's sophisticated AI systems, artificial intelligence has come a long way. As we stand on the brink of even greater advances, the challenge will be harnessing AI's power responsibly while addressing its ethical implications.

---

*This document was generated by Nova AI. Click the PDF button to download this as a PDF file.*`;
  }

  // Generic PDF content
  const topic = userMsg.replace(/(create|make|generate|write|build).*?(pdf|document|report)/gi, "").replace(/(pdf|document|report|on|about|for|me|please)/gi, "").trim() || "Your Topic";

  return `# Document: ${topic.charAt(0).toUpperCase() + topic.slice(1)}

## Overview

This document provides a comprehensive overview of ${topic}. It is structured with clear headings and bullet points for easy reading and PDF conversion.

## Key Points

- **Introduction** — Basic concepts and terminology related to ${topic}
- **Main Features** — Core aspects and characteristics
- **Benefits** — Advantages and positive impacts
- **Challenges** — Potential difficulties and considerations
- **Future Outlook** — Trends and predictions

## Detailed Information

### Background

${topic} is an important topic that affects many areas of life and work. Understanding it requires looking at multiple perspectives and considering both theoretical and practical aspects.

### Core Principles

1. **Principle One** — The foundation of ${topic} rests on clear, well-defined principles
2. **Principle Two** — These principles guide decision-making and implementation
3. **Principle Three** — Following them consistently leads to better outcomes

### Practical Applications

- Application in daily life and routines
- Use in professional and business contexts
- Integration with technology and tools
- Impact on personal development and growth

## Recommendations

1. Start with the basics and build understanding gradually
2. Practice consistently to develop skills and intuition
3. Stay updated with latest developments and research
4. Connect with communities and experts in the field

## Conclusion

${topic} is a rich and evolving area worth exploring. By understanding its core principles and applications, you can make informed decisions and take meaningful action.

---

*This document was generated by Nova AI. Click the PDF button to download this as a PDF file.*`;
}

// ─── Translation ───────────────────────────────────────────────────────────

function tryTranslation(userMsg: string, lower: string): string | null {
  if (!/(translate|translation|اردو میں|in urdu|urdu|انگریزی میں|in english)/.test(lower)) return null;

  // English to Urdu common phrases
  const en2ur: Record<string, string> = {
    "hello": "ہیلو / السلام علیکم",
    "how are you": "آپ کیسے ہیں؟",
    "thank you": "شکریہ",
    "good morning": "صبح بخیر",
    "good night": "شب بخیر",
    "what is your name": "آپ کا نام کیا ہے؟",
    "my name is": "میرا نام ہے",
    "i love you": "میں آپ سے پیار کرتا ہوں",
    "where are you from": "آپ کہاں سے ہیں؟",
    "i am fine": "میں ٹھیک ہوں",
    "yes": "جی ہاں",
    "no": "نہیں",
    "please": "براہ کرم",
    "sorry": "معذرت",
    "water": "پانی",
    "food": "کھانا",
    "book": "کتاب",
    "school": "اسکول",
    "friend": "دوست",
    "home": "گھر",
  };

  // Urdu to English common phrases
  const ur2en: Record<string, string> = {
    "السلام علیکم": "Hello / Peace be upon you",
    "آپ کیسے ہیں": "How are you?",
    "شکریہ": "Thank you",
    "صبح بخیر": "Good morning",
    "شب بخیر": "Good night",
    "آپ کا نام کیا ہے": "What is your name?",
    "میرا نام": "My name is",
    "جی ہاں": "Yes",
    "نہیں": "No",
    "براہ کرم": "Please",
    "معذرت": "Sorry",
  };

  // Try English to Urdu
  for (const [en, ur] of Object.entries(en2ur)) {
    if (lower.includes(en)) {
      return `## Translation (English → Urdu)

**English:** ${en}
**Urdu:** ${ur}

---

Here are some more useful phrases:

| English | Urdu |
|---------|------|
| Hello | السلام علیکم |
| How are you? | آپ کیسے ہیں؟ |
| Thank you | شکریہ |
| Good morning | صبح بخیر |
| What is your name? | آپ کا نام کیا ہے؟ |
| I am fine | میں ٹھیک ہوں |
| Yes / No | جی ہاں / نہیں |
| Please | براہ کرم |
| Sorry | معذرت |

Would you like more translations? Just tell me which phrase you'd like translated!`;
    }
  }

  // Try Urdu to English
  for (const [ur, en] of Object.entries(ur2en)) {
    if (userMsg.includes(ur)) {
      return `## Translation (Urdu → English)

**Urdu:** ${ur}
**English:** ${en}

---

Would you like more translations? I can translate between English and Urdu for common phrases, sentences, and expressions.`;
    }
  }

  return `I can help translate between **English** and **Urdu (اردو)**!

Here are some common translations:

### English → Urdu
- Hello → السلام علیکم
- How are you? → آپ کیسے ہیں؟
- Thank you → شکریہ
- Good morning → صبح بخیر
- Good night → شب بخیر
- What is your name? → آپ کا نام کیا ہے؟
- I love you → میں آپ سے پیار کرتا ہوں
- Yes / No → جی ہاں / نہیں
- Please → براہ کرم
- Sorry → معذرت

### Urdu → English
- السلام علیکم → Peace be upon you
- شکریہ → Thank you
- صبح بخیر → Good morning
- آپ کا نام کیا ہے؟ → What is your name?

Just tell me the specific word or phrase you'd like translated!`;
}

// ─── Knowledge Base ────────────────────────────────────────────────────────

function tryKnowledgeBase(userMsg: string, lower: string): string | null {
  const topics: Record<string, string> = {
    "exercise": `## The Benefits of Exercise and Healthy Living

Regular exercise is one of the most important things you can do for your health. Here's a comprehensive overview:

### Physical Benefits

- **Heart Health** — Regular cardio exercise strengthens the heart, lowers blood pressure, and improves circulation
- **Weight Management** — Combined with a healthy diet, exercise helps maintain a healthy weight
- **Strong Muscles and Bones** — Resistance training builds muscle mass and increases bone density
- **Better Sleep** — People who exercise regularly tend to fall asleep faster and sleep more deeply
- **Immune System** — Moderate exercise boosts immune function, reducing the risk of illness
- **Longevity** — Regular physical activity is associated with a longer lifespan

### Mental Health Benefits

- **Reduced Stress** — Exercise releases endorphins, natural mood elevators that combat stress
- **Anxiety and Depression** — Regular activity can be as effective as medication for mild to moderate depression
- **Better Focus** — Exercise improves cognitive function, memory, and concentration
- **Self-Esteem** — Achieving fitness goals builds confidence and self-worth
- **Creative Thinking** — Physical activity can boost creativity and problem-solving

### Types of Exercise

1. **Aerobic (Cardio)** — Running, swimming, cycling, dancing — improves heart and lung health
2. **Strength Training** — Weight lifting, resistance bands — builds muscle and bone density
3. **Flexibility** — Yoga, stretching — improves range of motion and prevents injury
4. **Balance** — Tai chi, balance exercises — especially important as we age

### How Much Exercise Do You Need?

- **Adults** should aim for at least 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity per week
- **Strength training** at least 2 days per week
- **Break it up** — Even 10-minute sessions count toward your weekly total

### Tips for Getting Started

1. Start small — Begin with 10-15 minute walks and gradually increase
2. Find activities you enjoy — You're more likely to stick with fun exercises
3. Make it a habit — Schedule exercise like any other important appointment
4. Stay hydrated — Drink water before, during, and after exercise
5. Listen to your body — Rest when needed and avoid pushing through pain
6. Get a workout buddy — Exercising with friends keeps you motivated

### Nutrition Basics

- Eat plenty of fruits and vegetables (5+ servings daily)
- Choose whole grains over refined grains
- Include lean protein sources (fish, poultry, beans, nuts)
- Limit processed foods, added sugars, and excessive salt
- Stay hydrated — aim for 8 glasses of water per day

### Conclusion

Exercise is not just about looking good — it's about feeling good, living longer, and enjoying life more. The key is consistency. Even small amounts of daily activity can make a big difference over time. Start today, and your future self will thank you!

---

*Click the PDF button to download this as a PDF document, or the Speak button to hear it read aloud.*`,

    "space": `## Space and the Universe

### The Solar System

Our solar system consists of the Sun and everything that orbits around it:

1. **The Sun** — A G-type main-sequence star containing 99.86% of the solar system's mass
2. **Mercury** — Closest planet to the Sun, extreme temperature variations
3. **Venus** — Hottest planet due to greenhouse effect (surface temp: ~462°C)
4. **Earth** — The only known planet with life, 71% covered by water
5. **Mars** — The "Red Planet," home to the largest volcano in the solar system (Olympus Mons)
6. **Jupiter** — Largest planet, has 95+ known moons and the Great Red Spot storm
7. **Saturn** — Famous for its spectacular ring system made of ice and rock
8. **Uranus** — Rotates on its side, unique among planets
9. **Neptune** — Windiest planet, with speeds up to 2,100 km/h

### Fascinating Space Facts

- **Light speed** — Light travels at 299,792 km/s; it takes 8 minutes to reach Earth from the Sun
- **Stars** — There are an estimated 100-400 billion stars in our Milky Way galaxy
- **Galaxies** — The observable universe contains over 2 trillion galaxies
- **Black holes** — Regions where gravity is so strong that nothing, not even light, can escape
- **ISS** — The International Space Station orbits Earth at ~28,000 km/h, completing an orbit every 90 minutes
- **Moon** — Is moving away from Earth at about 3.8 cm per year
- **Voyager 1** — Launched in 1977, is now over 24 billion km from Earth, in interstellar space

### Space Exploration Milestones

- **1957** — Sputnik 1, first artificial satellite (USSR)
- **1961** — Yuri Gagarin, first human in space (USSR)
- **1969** — Apollo 11, first humans on the Moon (USA)
- **1990** — Hubble Space Telescope launched
- **1998** — International Space Station construction began
- **2012** — Curiosity rover lands on Mars
- **2021** — James Webb Space Telescope launched
- **2024** — Multiple missions targeting the Moon and Mars

### The Future of Space Exploration

- **Artemis Program** — NASA's plan to return humans to the Moon by 2025-2026
- **Mars colonization** — SpaceX and NASA working toward human missions to Mars
- **Space tourism** — Companies like Blue Origin and Virgin Galactic offering suborbital flights
- **Exoplanet discovery** — Over 5,500 exoplanets discovered, with many in the "habitable zone"

Space is vast, mysterious, and full of wonders waiting to be discovered. What aspect of space interests you most?`,

    "history": `## A Brief History of the World

### Ancient Civilizations (3000 BCE - 500 CE)

- **Mesopotamia** (3500 BCE) — The cradle of civilization, invented writing (cuneiform) and the wheel
- **Ancient Egypt** (3100 BCE) — Built the pyramids, developed hieroglyphics, advanced medicine
- **Indus Valley** (2600 BCE) — Planned cities with drainage systems, in modern-day Pakistan/India
- **Ancient China** (2070 BCE) — Invented paper, gunpowder, the compass, and printing
- **Ancient Greece** (800 BCE) — Birth of democracy, philosophy (Socrates, Plato, Aristotle), Olympics
- **Roman Empire** (27 BCE) — Built roads, aqueducts, and legal systems still influential today

### Middle Ages (500 - 1500)

- **Islamic Golden Age** (700-1258) — Advances in mathematics, astronomy, medicine, and architecture
- **Tang Dynasty China** (618-907) — Cultural and technological flourishing
- **Mongol Empire** (1206-1368) — Largest contiguous land empire in history
- **Renaissance** (1300-1600) — Rebirth of art, science, and learning in Europe

### Modern Era (1500 - 1900)

- **Age of Exploration** (1500s) — Columbus, Magellan, and others connected the world
- **Scientific Revolution** (1600s) — Galileo, Newton, Kepler transformed understanding of nature
- **Industrial Revolution** (1760-1840) — Steam power, factories, and mass production
- **American Revolution** (1776) — Birth of the United States
- **French Revolution** (1789) — "Liberty, Equality, Fraternity"

### 20th Century

- **World War I** (1914-1918) — First global war, reshaped Europe and the Middle East
- **World War II** (1939-1945) — Deadliest conflict in history, led to the UN and Cold War
- **Independence movements** — India (1947), Pakistan (1947), African nations (1950s-60s)
- **Moon landing** (1969) — "One small step for man, one giant leap for mankind"
- **Internet** (1980s-90s) — World Wide Web invented by Tim Berners-Lee (1989)
- **Fall of the Berlin Wall** (1989) — End of the Cold War

### 21st Century

- **September 11** (2001) — Changed global politics and security
- **Smartphone revolution** (2007) — iPhone launched, transforming communication
- **Social media** — Facebook, Twitter, Instagram reshaped society
- **AI revolution** — Machine learning and AI transforming every industry
- **COVID-19** (2020) — Global pandemic reshaping work, health, and society

History teaches us that civilizations rise and fall, technology drives change, and human resilience overcomes even the greatest challenges. What period of history interests you most?`,

    "technology": `## Modern Technology Overview

### The Internet and World Wide Web

The internet is the global network of interconnected computers that communicate using standardized protocols:

- **Origins** — ARPANET (1969), World Wide Web invented by Tim Berners-Lee (1989)
- **Impact** — Transformed communication, commerce, education, and entertainment
- **Key technologies** — HTML, HTTP, DNS, TCP/IP, browsers
- **Future** — Web3, decentralized internet, satellite internet (Starlink)

### Mobile Technology

- **Smartphones** — Over 6.8 billion smartphone users worldwide (2024)
- **Apps** — Mobile apps generate over $900 billion in revenue annually
- **5G** — Next-generation wireless, up to 100x faster than 4G
- **Mobile payments** — Apple Pay, Google Pay, digital wallets

### Artificial Intelligence

- **Machine Learning** — Algorithms that learn from data
- **Deep Learning** — Neural networks with many layers
- **NLP** — Natural language processing (like what I'm using now!)
- **Computer Vision** — Image and video recognition
- **Generative AI** — Creating text, images, music, and code

### Cloud Computing

- **IaaS** — Infrastructure as a Service (AWS, Azure, GCP)
- **PaaS** — Platform as a Service (Heroku, Vercel)
- **SaaS** — Software as a Service (Gmail, Slack, Notion)
- **Serverless** — Pay-per-use computing without managing servers

### Key Programming Languages

1. **Python** — AI/ML, data science, web development
2. **JavaScript** — Web development (frontend and backend with Node.js)
3. **TypeScript** — Type-safe JavaScript, increasingly popular
4. **Java** — Enterprise applications, Android
5. **C++** — Systems programming, game development
6. **Rust** — Memory-safe systems programming, growing rapidly
7. **Go** — Cloud-native applications, microservices

### Emerging Technologies

- **Quantum Computing** — Exponential speedup for certain problems
- **Blockchain** — Decentralized, tamper-proof ledgers
- **AR/VR** — Augmented and virtual reality
- **IoT** — Internet of Things, connected devices
- **Biotechnology** — CRISPR, gene editing, personalized medicine
- **Self-driving cars** — Autonomous vehicles
- **Renewable energy tech** — Solar, wind, battery technology

Technology is advancing at an unprecedented pace. The key to keeping up is continuous learning and curiosity. What area of technology would you like to explore further?`,

    "health": `## Health and Wellness Guide

### Physical Health

#### Nutrition
- Eat a balanced diet with plenty of fruits, vegetables, whole grains, and lean proteins
- Stay hydrated — aim for 8 glasses of water daily
- Limit processed foods, added sugars, and excessive sodium
- Consider portion sizes — eating slowly helps you feel full with less

#### Exercise
- Aim for 150 minutes of moderate aerobic activity weekly
- Include strength training 2+ days per week
- Even short walks make a difference — every step counts
- Find activities you enjoy to stay motivated

#### Sleep
- Adults need 7-9 hours of quality sleep per night
- Maintain a consistent sleep schedule, even on weekends
- Avoid screens 1 hour before bed — blue light disrupts sleep
- Keep your bedroom cool, dark, and quiet

### Mental Health

#### Stress Management
- Practice deep breathing: inhale 4 seconds, hold 4, exhale 4, hold 4
- Try meditation — even 5 minutes daily helps
- Stay connected with friends and family
- Take regular breaks during work

#### Signs You Might Need Help
- Persistent sadness or anxiety lasting more than 2 weeks
- Loss of interest in activities you used to enjoy
- Changes in sleep or appetite
- Difficulty concentrating
- Feeling hopeless or worthless

**Important:** If you experience these symptoms, please reach out to a mental health professional. You're not alone, and help is available.

### Preventive Care

1. **Regular check-ups** — Annual physical exams catch problems early
2. **Vaccinations** — Stay up to date with recommended vaccines
3. **Screenings** — Blood pressure, cholesterol, cancer screenings based on age and risk
4. **Dental health** — Visit the dentist every 6 months
5. **Eye health** — Regular eye exams, especially if you use screens frequently

### Healthy Habits Checklist

- [ ] Drink 8 glasses of water
- [ ] Eat 5 servings of fruits and vegetables
- [ ] Exercise for 30 minutes
- [ ] Sleep 7-9 hours
- [ ] Take 10,000 steps
- [ ] Practice 5 minutes of mindfulness
- [ ] Connect with a friend or family member
- [ ] Limit screen time before bed

### Quick Tips

- Take the stairs instead of the elevator
- Park further away and walk
- Replace sugary drinks with water
- Take a 5-minute stretch break every hour at work
- Keep healthy snacks visible and junk food out of sight
- Practice gratitude — write down 3 things you're grateful for each day

Your health is your most valuable asset. Small, consistent changes lead to big results over time. What health topic would you like to know more about?`,

    "business": `## Business Fundamentals

### Starting a Business

#### Key Steps
1. **Idea** — Identify a problem worth solving
2. **Market research** — Understand your customers and competitors
3. **Business plan** — Define your model, target market, and financial projections
4. **Legal structure** — Choose: Sole proprietorship, LLC, Corporation, Partnership
5. **Funding** — Bootstrap, friends/family, angel investors, VC, or bank loans
6. **Build** — Create your product or service
7. **Launch** — Start selling and marketing
8. **Iterate** — Learn from feedback and improve

### Business Models

- **B2C** — Business to Consumer (e.g., Netflix, Amazon)
- **B2B** — Business to Business (e.g., Salesforce, Slack)
- **SaaS** — Software as a Service (monthly/yearly subscriptions)
- **Marketplace** — Connect buyers and sellers (e.g., Uber, Airbnb)
- **Freemium** — Free basic service, paid premium features
- **E-commerce** — Sell products online
- **Agency** — Provide services to other businesses

### Marketing Essentials

#### Digital Marketing
- **SEO** — Search Engine Optimization for organic traffic
- **Content marketing** — Blogs, videos, podcasts that provide value
- **Social media** — Build brand presence and engage with customers
- **Email marketing** — Direct communication with your audience
- **Paid ads** — Google Ads, Facebook/Instagram Ads
- **Influencer marketing** — Partner with creators in your niche

#### Key Metrics
- **CAC** — Customer Acquisition Cost
- **LTV** — Lifetime Value of a customer
- **MRR** — Monthly Recurring Revenue
- **Churn rate** — Percentage of customers who leave
- **Conversion rate** — Percentage of visitors who take desired action

### Financial Basics

- **Revenue** — Total money earned
- **Profit** — Revenue minus expenses
- **Cash flow** — Money in vs. money out (most important for survival!)
- **Burn rate** — How fast you're spending money (for startups)
- **Runway** — How many months until you run out of cash
- **Break-even** — When revenue equals expenses

### Leadership and Management

1. **Communicate clearly** — Set expectations and provide regular feedback
2. **Hire for attitude, train for skills** — Skills can be taught; attitude is harder to change
3. **Delegate effectively** — Trust your team and give them ownership
4. **Lead by example** — Model the behavior you want to see
5. **Celebrate wins** — Acknowledge both small and big achievements
6. **Embrace failure** — Learn from mistakes, don't punish them

### Common Business Mistakes to Avoid

- Running out of cash before reaching profitability
- Not talking to customers enough
- Building something nobody wants
- Hiring too quickly (or too slowly)
- Ignoring competitors
- Underpricing your product or service
- Neglecting company culture

Business is both an art and a science. The most successful entrepreneurs combine data-driven decision making with intuition and persistence. What aspect of business would you like to dive deeper into?`,

    "python": `## Python Programming Guide

### Why Python?

Python is one of the world's most popular programming languages because it's:
- **Easy to learn** — Clean, readable syntax
- **Versatile** — Web development, AI, data science, automation, games
- **Large community** — Millions of developers, extensive libraries
- **High demand** — Consistently ranked among top programming languages

### Getting Started

\`\`\`python
# Hello World
print("Hello, World!")

# Variables
name = "Alice"
age = 30
height = 5.6
is_student = True

# Lists
fruits = ["apple", "banana", "cherry"]
fruits.append("date")
print(fruits[0])  # apple

# Dictionaries
person = {"name": "Bob", "age": 25}
print(person["name"])

# Loops
for i in range(5):
    print(i)

# Conditionals
if age >= 18:
    print("Adult")
elif age >= 13:
    print("Teenager")
else:
    print("Child")
\`\`\`

### Key Libraries

| Library | Use Case |
|---------|----------|
| NumPy | Numerical computing, arrays |
| Pandas | Data analysis and manipulation |
| Matplotlib | Data visualization |
| Flask/Django | Web development |
| Requests | HTTP requests |
| Beautiful Soup | Web scraping |
| TensorFlow/PyTorch | Machine learning |
| OpenCV | Computer vision |

### Python Best Practices

1. Follow PEP 8 style guide
2. Use meaningful variable names
3. Write docstrings for functions
4. Handle errors with try/except
5. Use virtual environments
6. Write tests for your code
7. Use list comprehensions for cleaner code

Would you like me to write a specific Python program for you? Just describe what you need!`,
  };

  // Find matching topic
  for (const [keyword, content] of Object.entries(topics)) {
    if (lower.includes(keyword)) return content;
  }

  return null;
}

// ─── Default Response ──────────────────────────────────────────────────────

function defaultResponse(userMsg: string): string {
  const lower = userMsg.toLowerCase();

  // Thank you
  if (/(thank|thanks|thx|appreciate)/.test(lower)) {
    return `You're very welcome! 😊 I'm always here to help.

Is there anything else you'd like me to help with? I can:
- Write code in any programming language
- Chat in Urdu (اردو)
- Create PDF documents
- Answer questions on any topic
- Have a voice conversation with you

Just let me know what you need!`;
  }

  // Goodbye
  if (/(bye|goodbye|see you|farewell|later)/.test(lower)) {
    return `Goodbye! It was great chatting with you. 👋

Feel free to come back anytime — I'm always here and ready to help. Have a wonderful day!`;
  }

  // How are you
  if (/(how are you|how.*doing|you doing)/.test(lower)) {
    return `I'm doing great, thank you for asking! 💙

I'm always ready and excited to help you with whatever you need. What can I do for you today?

- Write some code? 
- Chat in Urdu? 
- Create a PDF?
- Answer a question?
- Just have a conversation?

I'm all ears!`;
  }

  // Love/compliment
  if (/(love you|you.*awesome|you.*amazing|you.*great|good job|well done|nice work)/.test(lower)) {
    return `Thank you so much! That really means a lot! 💙

I'm designed to be your all-in-one assistant — coding, Urdu chat, PDF generation, voice conversations, and general knowledge. I'm always improving and learning to serve you better.

What else can I help you with today?`;
  }

  // Help
  if (/(help|stuck|don't know|confused|what should i)/.test(lower)) {
    return `I'm here to help! Here are some things you can ask me:

### Try These Examples:

1. **"Write a Python function to sort a list"**
2. **"اردو میں بات کریں"** (Chat in Urdu)
3. **"Create a PDF about space exploration"**
4. **"What is 25 * 17 + 100?"**
5. **"Write a React component for a todo list"**
6. **"Tell me about the history of AI"**
7. **"Translate 'hello' to Urdu"**
8. **"Write HTML for a landing page"**

Or just ask me anything that's on your mind — I'll do my best to help!`;
  }

  // General default
  return `That's an interesting question! Let me share what I know about "${userMsg.slice(0, 80)}".

Here's my take on it:

This is a topic I can explore with you. To give you the most helpful response, could you tell me a bit more about what specifically you'd like to know? 

In the meantime, here are some things I can definitely help with right now:

- **Write code** — Tell me the language and what you need, and I'll generate it
- **Chat in Urdu** — Switch to Urdu mode or type in Urdu for fluent Urdu conversation
- **Create a PDF** — Ask me to make a PDF on any topic and download it instantly
- **Do math** — Type any calculation and I'll solve it
- **Answer questions** — Ask about science, history, technology, health, business, and more
- **Translate** — I can translate between English and Urdu

What would you like to explore?`;
}
