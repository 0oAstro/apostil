import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const ENDPOINT = "https://mock.test/v1";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

type ToolCall = { tool: string; input: unknown };

function toolStream({ tool, input }: ToolCall): string {
  const json = JSON.stringify(input);
  const chunk = (delta: unknown, finish: string | null = null) =>
    `data: ${JSON.stringify({ id: "1", object: "chat.completion.chunk", created: 1, model: "mock", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;

  let body = chunk({ role: "assistant", tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: tool, arguments: "" } }] });
  for (let index = 0; index < json.length; index += 24) {
    body += chunk({ tool_calls: [{ index: 0, function: { arguments: json.slice(index, index + 24) } }] });
  }
  return `${body}${chunk({}, "tool_calls")}data: [DONE]\n\n`;
}

function textStream(text: string): string {
  const chunk = (delta: unknown, finish: string | null = null) =>
    `data: ${JSON.stringify({ id: "1", object: "chat.completion.chunk", created: 1, model: "mock", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
  return `${chunk({ role: "assistant", content: text })}${chunk({}, "stop")}data: [DONE]\n\n`;
}

async function mockProvider(page: Page, answer: (body: { tools?: unknown[] }) => string | { status: number; body: string }) {
  const requests: string[] = [];
  await page.route(`${ENDPOINT}/**`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const raw = route.request().postData() ?? "{}";
    requests.push(raw);
    const result = answer(JSON.parse(raw));
    if (typeof result === "string") {
      await route.fulfill({ status: 200, headers: { ...CORS, "content-type": "text/event-stream" }, body: result });
    } else {
      await route.fulfill({ status: result.status, headers: { ...CORS, "content-type": "application/json" }, body: result.body });
    }
  });
  return requests;
}

async function connect(page: Page) {
  await page.addInitScript((endpoint) => {
    localStorage.setItem("apostil.connection", JSON.stringify({ provider: "openai-compatible", apiKey: "k", model: "mock", endpoint, region: "" }));
  }, ENDPOINT);
}

async function newNote(page: Page, title: string) {
  await page.goto("/write/");
  await page.waitForSelector(".cm-content");
  await page.getByRole("button", { name: "Open notes" }).click();
  await page.getByRole("button", { name: "New note" }).click();
  await page.fill('input[aria-label="Title"]', title);
  await page.click(".cm-content");
}

const MARGIN_REPLY = "Worthless for what, exactly? The credential, or the learning? Those fail in very different ways, and your claim only names one of them.";
const LINE = "college is becoming worthless because of AI";

const DRAWING = {
  text: "Here is the grid.",
  diagram: {
    title: "Grid",
    height: 200,
    stages: [
      { caption: "First stage caption.", shapes: [{ type: "rect", x: 100, y: 20, width: 60, height: 60 }] },
      { caption: "Second stage caption.", shapes: [{ type: "text", x: 130, y: 50, text: "2", anchor: "middle" }] },
    ],
  },
};

test("the landing page reflows its text around the ink when dragged", async ({ page }) => {
  await page.goto("/");
  const firstLine = page.locator('[role="paragraph"] span').first();
  await expect(firstLine).toBeVisible();
  const lines = () => page.locator('[role="paragraph"] span').allTextContents();
  const before = await lines();

  const blot = page.locator("[data-ink-blot]");
  const box = await blot.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x - 300, box!.y + 40, { steps: 6 });
  await page.mouse.up();

  expect(await lines()).not.toEqual(before);
  await page.getByRole("link", { name: "Start writing" }).click();
  await expect(page).toHaveURL(/\/write\//);
});

test("reading along leaves a margin note whose height Pretext predicted", async ({ page }) => {
  await connect(page);
  await mockProvider(page, () => toolStream({ tool: "margin_note", input: { quote: "worthless", side: "right", text: MARGIN_REPLY } }));
  await newNote(page, "Ideas");
  await page.keyboard.type(LINE);

  const margin = page.locator("[data-margin-note]");
  await expect(margin).toContainText(MARGIN_REPLY.slice(0, 40));
  await expect(margin).toContainText(MARGIN_REPLY);
  await expect(page.locator(".cm-thread-mark")).toHaveText("worthless");

  const predicted = Number(await margin.getAttribute("data-predicted-height"));
  const actual = (await margin.boundingBox())!.height;
  expect(Math.abs(predicted - actual)).toBeLessThanOrEqual(1);
});

test("the anchor follows edits made above it", async ({ page }) => {
  await connect(page);
  await mockProvider(page, () => toolStream({ tool: "margin_note", input: { quote: "worthless", side: "right", text: "Why?" } }));
  await newNote(page, "Ideas");
  await page.keyboard.type(LINE);
  await expect(page.locator(".cm-thread-mark")).toHaveText("worthless");

  await page.keyboard.press("Control+Home");
  await page.keyboard.type("A new first line\n");
  await expect(page.locator(".cm-thread-mark")).toHaveText("worthless");
});

test("a silent read leaves no trace and each line is read once", async ({ page }) => {
  await connect(page);
  const requests = await mockProvider(page, () => toolStream({ tool: "stay_silent", input: {} }));
  await newNote(page, "Quiet");
  await page.keyboard.type(LINE);
  await expect.poll(() => requests.length).toBe(1);
  await page.waitForTimeout(1800);
  expect(requests).toHaveLength(1);
  await expect(page.locator("[data-margin-note], [data-thread-inline]")).toHaveCount(0);
});

test("when-asked mode sends nothing until asked", async ({ page }) => {
  await connect(page);
  const requests = await mockProvider(page, () => toolStream({ tool: "draw", input: DRAWING }));
  await newNote(page, "Quiet");
  await page.getByRole("button", { name: /Reads along/ }).click();
  await page.getByRole("menuitem", { name: /When you ask/ }).click();
  await page.click(".cm-content");
  await page.keyboard.type(LINE);
  await page.waitForTimeout(1800);
  expect(requests).toHaveLength(0);

  await page.keyboard.press("Control+a");
  await page.getByRole("button", { name: /Visualize/ }).click();
  const inline = page.locator("[data-thread-inline]");
  await expect(inline.locator("svg[role=img]")).toBeVisible();
  await expect(inline.locator("figcaption")).toContainText("Second stage caption.");
  await inline.getByRole("button", { name: "Previous stage" }).click();
  await expect(inline.locator("figcaption")).toContainText("First stage caption.");
  expect(requests).toHaveLength(1);
});

test("a provider failure is reported and nothing is substituted", async ({ page }) => {
  await connect(page);
  const requests = await mockProvider(page, () => ({ status: 401, body: JSON.stringify({ error: { message: "Bad key from provider" } }) }));
  await newNote(page, "Broken");
  await page.keyboard.type(LINE);
  await expect(page.getByText("Bad key from provider")).toBeVisible();
  expect(requests).toHaveLength(1);
  await expect(page.locator("[data-margin-note], [data-thread-inline]")).toHaveCount(0);
});

test("model markup is shown as text and cannot run", async ({ page }) => {
  await connect(page);
  await mockProvider(page, () =>
    toolStream({ tool: "inline_reply", input: { text: 'Look <img src=x onerror="window.pwned=1"> and [click](javascript:window.pwned=1) and **bold**' } }),
  );
  await newNote(page, "Hostile");
  await page.keyboard.type(LINE);
  const inline = page.locator("[data-thread-inline]");
  await expect(inline.locator("strong")).toHaveText("bold");
  await expect(inline.locator("img")).toHaveCount(0);
  await expect(inline.locator("a")).toHaveCount(0);
  expect(await page.evaluate(() => "pwned" in window)).toBe(false);
});

test("the margin holds a conversation and just-my-words hides it", async ({ page }) => {
  await connect(page);
  let turn = 0;
  await mockProvider(page, () => {
    turn += 1;
    return turn === 1
      ? toolStream({ tool: "margin_note", input: { quote: "worthless", side: "right", text: "Worthless for what?" } })
      : toolStream({ tool: "respond", input: { text: "Then say which one." } });
  });
  await newNote(page, "Talk");
  await page.keyboard.type(LINE);
  const margin = page.locator("[data-margin-note]");
  await expect(margin).toContainText("Worthless for what?");

  await page.locator(".cm-thread-mark").click();
  await page.getByRole("textbox", { name: "Reply" }).fill("The credential");
  await page.getByRole("textbox", { name: "Reply" }).press("Enter");
  await expect(margin).toContainText("Then say which one.");

  const predicted = Number(await margin.getAttribute("data-predicted-height"));
  expect(Math.abs(predicted - (await margin.boundingBox())!.height)).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Open notes" }).click();
  await page.getByRole("button", { name: "Just my words" }).click();
  await expect(margin).toHaveCount(0);
  await expect(page.locator(".cm-thread-mark")).toHaveCount(0);
});

test("the side chat answers about the note", async ({ page }) => {
  await connect(page);
  const requests = await mockProvider(page, () => textStream("Start with **the credential**."));
  await newNote(page, "Chat");
  await page.getByRole("button", { name: /Reads along/ }).click();
  await page.getByRole("menuitem", { name: /When you ask/ }).click();
  await page.click(".cm-content");
  await page.keyboard.type(LINE);

  await page.getByRole("button", { name: "Chat" }).click();
  await page.getByRole("button", { name: "What should I work on next?" }).click();
  const chat = page.getByRole("complementary", { name: "Chat about this note" });
  await expect(chat.locator("strong")).toHaveText("the credential");
  expect(requests[0]).toContain(LINE);
});

test("markdown export can leave out everything but the writer's words", async ({ page }) => {
  await connect(page);
  await mockProvider(page, () => toolStream({ tool: "margin_note", input: { quote: "worthless", side: "right", text: "Why?" } }));
  await newNote(page, "Exported note");
  await page.keyboard.type(LINE);
  await expect(page.locator("[data-margin-note]")).toContainText("Why?");

  async function exportMarkdown() {
    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("button", { name: /^Markdown/ }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export Markdown" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("exported-note.md");
    return readFileSync(await file.path(), "utf8");
  }

  expect(await exportMarkdown()).toContain("**Apostil:** Why?");
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("switch", { name: "Include the margins" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(await exportMarkdown()).toBe(`# Exported note\n\n${LINE}\n`);
});

test("word export produces a document", async ({ page }) => {
  await page.goto("/write/");
  await page.waitForSelector(".cm-content");
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: /^Word/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Word" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("start-here.docx");
  expect(readFileSync(await file.path()).subarray(0, 2).toString()).toBe("PK");
});

test("slash commands and list continuation edit the note", async ({ page }) => {
  await newNote(page, "Keys");
  await page.keyboard.type("/head");
  await expect(page.getByRole("listbox", { name: "Commands" })).toBeVisible();
  await page.keyboard.press("Enter");
  await page.keyboard.type("A heading\n- first");
  await page.keyboard.press("Enter");
  await page.keyboard.type("second");
  await expect(page.locator(".cm-content")).toContainText("second");
  await expect(page.locator(".cm-h1")).toHaveText("A heading");
  await expect(page.locator(".cm-list")).toHaveCount(2);
});

test("notes, threads and instructions survive a reload", async ({ page }) => {
  await connect(page);
  await mockProvider(page, () => toolStream({ tool: "margin_note", input: { quote: "worthless", side: "left", text: "Why?" } }));
  await newNote(page, "Kept");
  await page.getByRole("button", { name: "Tell Apostil" }).click();
  await page.keyboard.type("Be blunt.");
  await page.click(".cm-content");
  await page.keyboard.type(LINE);
  await expect(page.locator("[data-margin-note]")).toContainText("Why?");
  await page.waitForTimeout(500);

  await page.reload();
  await page.waitForSelector(".cm-content");
  await expect(page.locator('input[aria-label="Title"]')).toHaveValue("Kept");
  await expect(page.locator("[data-margin-note]")).toContainText("Why?");
  await expect(page.getByRole("textbox", { name: "Tell Apostil" })).toHaveValue("Be blunt.");
});

test("the palette finds and starts notes, and marks-only hides the margins", async ({ page }) => {
  await page.goto("/write/");
  await page.waitForSelector(".cm-content");
  await page.keyboard.press("Control+k");
  await page.keyboard.type("A brand new idea");
  await page.keyboard.press("Enter");
  await expect(page.locator('input[aria-label="Title"]')).toHaveValue("A brand new idea");

  await page.keyboard.press("Control+k");
  await page.keyboard.type("start here");
  await page.keyboard.press("Enter");
  await expect(page.locator('input[aria-label="Title"]')).toHaveValue("Start here");
  await expect(page.locator("[data-margin-note]")).toHaveCount(1);

  await page.getByRole("button", { name: "Open notes" }).click();
  await page.getByRole("button", { name: "Customize Apostil" }).click();
  await page.getByRole("button", { name: /Marks only/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-margin-note]")).toHaveCount(0);
  await page.locator(".cm-thread-mark").click();
  await expect(page.locator("[data-margin-note]")).toHaveCount(1);
});

test("without a model the app still writes and asks for a connection when used", async ({ page }) => {
  await newNote(page, "Offline");
  await page.keyboard.type(LINE);
  await page.keyboard.press("Control+a");
  await page.getByRole("button", { name: /Gloss this/ }).click();
  const dialog = page.getByRole("dialog", { name: "Connect a model" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Model" })).toHaveValue("us.anthropic.claude-haiku-5-5");
});

test("a connection that fails its test shows why and is not saved", async ({ page }) => {
  await mockProvider(page, () => ({ status: 403, body: JSON.stringify({ error: { message: "Key rejected" } }) }));
  await page.goto("/write/");
  await page.waitForSelector(".cm-content");
  await page.getByRole("button", { name: "Connect a model" }).click();
  const dialog = page.getByRole("dialog", { name: "Connect a model" });
  await dialog.getByRole("combobox", { name: "Provider" }).selectOption("openai-compatible");
  await dialog.getByRole("textbox", { name: "Model" }).fill("mock");
  await dialog.getByRole("textbox", { name: "Endpoint" }).fill(ENDPOINT);
  await dialog.getByRole("button", { name: "Test and save" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Key rejected");
  expect(await page.evaluate(() => localStorage.getItem("apostil.connection"))).toBeNull();
});

test("holding delete removes the note and a short press does not", async ({ page }) => {
  await newNote(page, "Throwaway");
  await page.getByRole("button", { name: "Open notes" }).click();
  const hold = page.getByRole("button", { name: "Hold to delete note" });
  await hold.hover();
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(page.locator('input[aria-label="Title"]')).toHaveValue("Throwaway");

  await page.mouse.down();
  await expect(page.locator('input[aria-label="Title"]')).toHaveValue("Start here", { timeout: 3000 });
  await page.mouse.up();
});

const PROVIDER_REQUESTS = [
  { provider: "amazon-bedrock", model: "us.anthropic.claude-haiku-5-5", url: "https://bedrock-runtime.us-east-1.amazonaws.com/model/us.anthropic.claude-haiku-5-5/converse-stream", header: "authorization", value: "Bearer test-key" },
  { provider: "anthropic", model: "claude-haiku-5-5", url: "https://api.anthropic.com/v1/messages", header: "x-api-key", value: "test-key" },
  { provider: "openai", model: "gpt-5.5", url: "https://api.openai.com/v1/responses", header: "authorization", value: "Bearer test-key" },
  { provider: "google", model: "gemini-2.5-flash", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse", header: "x-goog-api-key", value: "test-key" },
];

for (const expected of PROVIDER_REQUESTS) {
  test(`${expected.provider} sends its key to its own endpoint`, async ({ page }) => {
    const seen: { url: string; key: string | undefined }[] = [];
    await page.route(/bedrock-runtime|api\.anthropic|api\.openai|generativelanguage/, async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS });
        return;
      }
      seen.push({ url: request.url(), key: request.headers()[expected.header] });
      await route.fulfill({ status: 403, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify({ message: "Rejected in test", error: { message: "Rejected in test" } }) });
    });
    await page.goto("/write/");
    await page.waitForSelector(".cm-content");
    await page.getByRole("button", { name: "Connect a model" }).click();
    const dialog = page.getByRole("dialog", { name: "Connect a model" });
    await dialog.getByRole("combobox", { name: "Provider" }).selectOption(expected.provider);
    await dialog.getByRole("textbox", { name: "API key" }).fill("test-key");
    await dialog.getByRole("textbox", { name: "Model" }).fill(expected.model);
    await dialog.getByRole("button", { name: "Test and save" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(seen[0]).toEqual({ url: expected.url, key: expected.value });
  });
}

test("a pasted image shows in the note and reaches the model", async ({ page }) => {
  await connect(page);
  const requests = await mockProvider(page, () => toolStream({ tool: "inline_reply", input: { text: "I can see it." } }));
  await newNote(page, "Lecture");
  await page.getByRole("button", { name: /Reads along/ }).click();
  await page.getByRole("menuitem", { name: /When you ask/ }).click();
  await page.click(".cm-content");
  await page.keyboard.type(LINE);

  await page.evaluate(async () => {
    const pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const bytes = Uint8Array.from(atob(pixel), (character) => character.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "slide.png", { type: "image/png" }));
    document.querySelector(".cm-content")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  const image = page.locator("img.cm-note-image");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(1);

  await page.locator(".cm-content").getByText(LINE).click({ clickCount: 3 });
  await page.getByRole("button", { name: /Gloss this/ }).click();
  await expect(page.locator("[data-thread-inline]")).toContainText("I can see it.");
  expect(requests[0]).toContain("data:image/png;base64");
});

test("a drawing request that returns no drawing is reported as a failure", async ({ page }) => {
  await connect(page);
  await mockProvider(page, () => toolStream({ tool: "draw", input: { text: "Here is the picture." } }));
  await newNote(page, "No drawing");
  await page.getByRole("button", { name: /Reads along/ }).click();
  await page.getByRole("menuitem", { name: /When you ask/ }).click();
  await page.click(".cm-content");
  await page.keyboard.type(LINE);
  await page.keyboard.press("Control+a");
  await page.getByRole("button", { name: /Visualize/ }).click();
  await expect(page.locator("[data-thread-inline]").getByRole("alert")).toHaveText("The model finished without drawing anything.");
});
