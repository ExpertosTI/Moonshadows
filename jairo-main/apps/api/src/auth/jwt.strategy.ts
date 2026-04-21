import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Check if user still exists
    const res = await this.db.query('SELECT id, email, role, company_id FROM users WHERE id = $1', [payload.id]);
    
    if (res.rows.length === 0) {
      throw new UnauthorizedException();
    }

    const user = res.rows[0];
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    };
  }
}
