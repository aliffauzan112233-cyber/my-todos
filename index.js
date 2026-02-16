import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

import { serveStatic } from "@hono/node-server/serve-static";

import { setCookie, getCookie } from "hono/cookie";

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { db } from "./db/index.js";
import { users, todos } from "./db/schema.js";
import { and, eq } from "drizzle-orm";

const app = new Hono();
app.use("/*", serveStatic({ root: "./public" }));


const authMiddleware = async (c, next) => {
  const token = getCookie(c, "token");

  if (!token) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    c.set("user", {
      id: payload.id,
      username: payload.username,
    });

    await next();
  } catch (err) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
};


//Register
app.post("/api/register", async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json(
        { success: false, message: "Username dan password wajib diisi" },
        400
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db
      .insert(users)
      .values({ username, password: hashedPassword })
      .returning({
        id: users.id,
        username: users.username,
      });

    return c.json({ success: true, data: newUser[0] }, 201);
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return c.json({ success: false, message: "Registrasi gagal" }, 500);
  }
});

//Login
app.post("/api/login", async (c) => {
  try {
    const { username, password } = await c.req.json();

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.username, username),
    });

    if (!user) {
      return c.json(
        { success: false, message: "Username atau password salah" },
        401
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return c.json(
        { success: false, message: "Username atau password salah" },
        401
      );
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    setCookie(c, "token", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 3600,
    });

    return c.json({ success: true, message: "Login berhasil" });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return c.json({ success: false, message: "Login gagal" }, 500);
  }
});

//Get Me (untuk mengecek apakah sudah login atau belum)
app.get("/api/me", authMiddleware, (c) => {
  return c.json({ success: true, data: c.get("user") });
});

//Logout (keluar)
app.post("/api/logout", (c) => {
  setCookie(c, "token", "", { maxAge: -1 });
  return c.json({ success: true, message: "Logout berhasil" });
});

//Create Todo (membuat)
app.post("/api/todos", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const { note } = await c.req.json();

    if (!note || note.trim() === "") {
      return c.json({ success: false, message: "Note wajib diisi" }, 400);
    }

    const [todo] = await db
      .insert(todos)
      .values({
        note,
        userId: my-todos.id,
        status: "pending",
      })
      .returning();

    return c.json({ success: true, data: todo });
  } catch (err) {
    console.error("CREATE TODO ERROR:", err);
    return c.json({ success: false, message: "Server error" }, 500);
  }
});


//Get Todo (untuk mengambil data)
app.get("/api/todos", authMiddleware, async (c) => {
  const user = c.get("user");

  const data = await db.query.todos.findMany({
    where: (t, { eq }) => eq(t.userId, my-todos.id),
  });

  return c.json({ success: true, data });
});


// update Todo Status
app.put("/api/todos/:id/status", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  const { status } = await c.req.json();

  const [updated] = await db
    .update(todos)
    .set({ status })
    .where(and(eq(todos.id, id), eq(todos.userId, my-todos.id)))
    .returning();

  if (!updated) {
    return c.json({ success: false, message: "Todo tidak ditemukan" }, 404);
  }

  return c.json({ success: true, data: updated });
});

//Delete Todo
app.delete("/api/todos/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));

  const [deleted] = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, my-todos.id)))
    .returning();

  if (!deleted) {
    return c.json({ success: false, message: "Todo tidak ditemukan" }, 404);
  }

  return c.json({ success: true });
});


// Home
app.get("/", (c) =>
  c.html("<h1>Tim Pengembang</h1><h2>Nama Kalian</h2>")
);

// server
const port = 5000;
console.log(`🚀 Server is running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
