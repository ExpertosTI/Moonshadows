import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { events, eventAttendance } from '@repo/database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly db: DatabaseService) {}

  async createEvent(data: any) {
    return this.db.drizzle.insert(events).values(data).returning();
  }

  async listEvents() {
    return this.db.drizzle.query.events.findMany({
      orderBy: (events, { desc }) => [desc(events.eventDate)],
    });
  }

  async registerAttendance(data: any) {
    this.logger.log(`📝 Registering attendance for ${data.guestName} at event ${data.eventId}`);
    
    // Check if already registered
    const existing = await this.db.drizzle.query.eventAttendance.findFirst({
      where: and(
        eq(eventAttendance.eventId, data.eventId),
        eq(eventAttendance.email, data.email)
      )
    });

    if (existing) {
      return this.db.drizzle.update(eventAttendance)
        .set({ ...data, confirmed: true, validatedAt: new Date() })
        .where(eq(eventAttendance.id, existing.id))
        .returning();
    }

    return this.db.drizzle.insert(eventAttendance)
      .values({ ...data, confirmed: true, validatedAt: new Date() })
      .returning();
  }

  async getAttendanceList(eventId: string) {
    return this.db.drizzle.query.eventAttendance.findMany({
      where: eq(eventAttendance.eventId, eventId),
      orderBy: (attendance, { desc }) => [desc(attendance.createdAt)],
    });
  }

  async generateAIProfile(data: { companyName: string, guestName: string }) {
    this.logger.log(`🤖 Generating AI Networking Profile for ${data.companyName} (${data.guestName})`);
    
    // Mockup of AI capability for MVP. In a real scenario, this would call Anthropic/Claude API 
    // using the Insforge Service to analyze the company's sector and match potential business opportunities.
    const tags = ["High Value", "B2B Lead", "Strategic Alliance"];
    
    if (data.companyName.toLowerCase().includes("tech") || data.companyName.toLowerCase().includes("soft")) {
      tags.push("Digital Transformation", "SaaS");
    } else if (data.companyName.toLowerCase().includes("farmacia") || data.companyName.toLowerCase().includes("salud")) {
      tags.push("Healthcare", "Retail");
    } else {
      tags.push("Corporate", "Networking");
    }

    // Retorna un perfil enriquecido que el frontend pueda mostrar instantáneamente al hacer Check-in.
    return {
      success: true,
      aiProfile: {
        matchScore: Math.floor(Math.random() * (99 - 85 + 1)) + 85, // 85% to 99%
        networkingTags: tags,
        aiSummary: `El sistema Insforge ha identificado a ${data.companyName} como un nodo estratégico de alto valor para alianzas B2B. Potencial de sinergia: Alto.`
      }
    };
  }
}
