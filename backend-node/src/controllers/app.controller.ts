import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { BookService } from "../services/book.service";
import { WorkflowService } from "../services/workflow.service";
import { LookupService } from "../services/lookup.service";
import prisma from "../config/prisma";
function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  if (!value) throw new Error("Missing required route parameter");
  return value;
}

function queryString(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (value == null) return "";
  return String(value);
}

function queryNumber(value: unknown, fallback: number): number {
  const parsed = parseInt(queryString(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export class AppController {
  

  static async exportBooks(req: AuthRequest, res: Response) {
  try {
    const books = await prisma.book.findMany({
      include: {
        genre: true,
        owner: true,
      },
    });

    const result = books.map(book => ({
      title: book.title,
      author: book.author,
      genre: book.genre?.name ?? "",
      owner: book.owner?.fullName ?? "",
      availabilityStatus: book.availabilityStatus,
      createdAt: book.createdAt.toISOString(),
    }));

    const headers = Object.keys(result[0] || {});

    const csv = [
      headers.join(","),
      ...result.map(row =>
        headers
          .map(header =>
            `"${String((row as any)[header] ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=BookNook.csv"
    );

    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({
      message: "Failed to export books",
    });
  }
}
  static async me(req: AuthRequest, res: Response) {
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  }

  static async catalog(req: AuthRequest, res: Response) {
    try {
      const { search, genreId, availability, sort, page, size } = req.query;
      const result = await BookService.catalog({
        search: queryString(search),
        genreId: queryString(genreId),
        availability: queryString(availability),
        sort: queryString(sort),
        page: queryNumber(page, 0),
        size: queryNumber(size, 20),
      }, req.user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async myBooks(req: AuthRequest, res: Response) {
    try {
      const { page, size } = req.query;

      const result = await BookService.myBooks(
        req.user.id,
        queryNumber(page, 0),
        queryNumber(size, 20)
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getBook(req: AuthRequest, res: Response) {
    try {
      const result = await BookService.get(paramString(req.params.id));
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  static async createBook(req: AuthRequest, res: Response) {
    try {
      const result = await BookService.create(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateBook(req: AuthRequest, res: Response) {
    try {
      const result = await BookService.update(
        req.user.id,
        paramString(req.params.id),
        req.body,
        req.user.role === "ADMIN"
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteBook(req: AuthRequest, res: Response) {
    try {
      await BookService.delete(
        req.user.id,
        paramString(req.params.id),
        req.user.role === "ADMIN"
      );

      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async myRequests(req: AuthRequest, res: Response) {
    try {
      const { page, size } = req.query;

      const result = await WorkflowService.myRequests(
        req.user.id,
        req.user.role === "ADMIN",
        queryNumber(page, 0),
        queryNumber(size, 20)
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async requestBook(req: AuthRequest, res: Response) {
    try {
      const result = await WorkflowService.requestBook(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async approveRequest(req: AuthRequest, res: Response) {
    try {
      const result = await WorkflowService.approve(
        req.user.id,
        paramString(req.params.id),
        req.user.role === "ADMIN"
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async rejectRequest(req: AuthRequest, res: Response) {
    try {
      const result = await WorkflowService.reject(
        req.user.id,
        paramString(req.params.id),
        req.user.role === "ADMIN"
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async borrowed(req: AuthRequest, res: Response) {
    try {
      const { page, size } = req.query;

      const result = await WorkflowService.borrowed(
        req.user.id,
        queryNumber(page, 0),
        queryNumber(size, 20)
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async loanHistory(req: AuthRequest, res: Response) {
    try {
      const { page, size } = req.query;

      const result = await WorkflowService.history(
        req.user.id,
        req.user.role === "ADMIN",
        queryNumber(page, 0),
        queryNumber(size, 20)
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async returnBook(req: AuthRequest, res: Response) {
    try {
      const result = await WorkflowService.returnBook(
        req.user.id,
        paramString(req.params.id),
        req.user.role === "ADMIN"
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async genres(req: AuthRequest, res: Response) {
    try {
      const result = await LookupService.genres();
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async dashboard(req: AuthRequest, res: Response) {
    try {
      const result = await LookupService.dashboard(req.user.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async bookHistory(req: AuthRequest, res: Response) {
    try {
      const { page, size } = req.query;

      const result = await LookupService.bookHistory(
        paramString(req.params.id),
        queryNumber(page, 0),
        queryNumber(size, 20)
      );

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}