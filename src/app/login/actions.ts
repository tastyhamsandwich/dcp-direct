'use server'

import { createClient } from '@supabaseS'
import { redirect } from 'next/navigation'
import { loginSchema } from '@lib/zod';
import { validateUser } from '@db/database';
import { createSession } from '@lib/session';

export async function loginAction(prevState: any, formData: FormData) {
    
    const validatedFields = loginSchema.safeParse({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      });
    
    if (!validatedFields.success)
      return { errors: validatedFields.error.flatten().fieldErrors };
    
    const result = await validateUser(validatedFields.data.email, validatedFields.data.password);
    
    if (result.success && result.user.id && result.user.role)
      createSession(result.user.id.toString(), result.user.role);
    
    redirect('/dashboard')
}