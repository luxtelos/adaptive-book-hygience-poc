import { supabase } from './supabaseConnect';

export interface RegistrationData {
  id?: string;
  clerk_id?: string; // Optional for backward compatibility
  first_name: string;
  last_name: string;
  email: string; // Now the primary key
  phone: string;
  company: string;
  business_type: string;
  bookkeeping_challenges: string;
  current_software: string;
  monthly_revenue: string;
  urgency_level: string;
  created_at?: string;
  updated_at?: string;
}

export class RegistrationService {
  static async getRegistrationData(email: string): Promise<RegistrationData | null> {
    try {
      const { data, error } = await supabase
        .from('registration_data')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows found
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching registration data:', error);
      throw error;
    }
  }

  static async saveRegistrationData(data: Omit<RegistrationData, 'id' | 'created_at' | 'updated_at'>) {
    try {
      // First check if registration data exists for this email
      const existingData = await this.getRegistrationData(data.email);
      
      if (existingData) {
        // Update existing record
        const { data: result, error } = await supabase
          .from('registration_data')
          .update({ 
            ...data, 
            updated_at: new Date().toISOString() 
          })
          .eq('email', data.email)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return result;
      } else {
        // Create new record
        const { data: result, error } = await supabase
          .from('registration_data')
          .insert([{ 
            ...data, 
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          }])
          .select()
          .single();

        if (error) {
          throw error;
        }

        return result;
      }
    } catch (error) {
      console.error('Error saving registration data:', error);
      throw error;
    }
  }
}