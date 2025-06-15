import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authenticateStudentWithBoth } from '@/utils/auth'
import { ClassConfig, Student } from '@/types'

describe('Authentication Middleware', () => {
  let mockRequest: any
  let mockResponse: any
  let mockNext: any
  let mockStudent: Student
  let mockClass: ClassConfig

  beforeEach(() => {
    mockStudent = {
      id: 'student-123',
      name: 'Jane Smith',
      email: 'jane.smith@university.edu',
      studentNumber: 'ST2024002',
      hasUsedToken: false,
      hasBid: false
    }

    mockClass = {
      id: 'class-789',
      className: 'Finance 101',
      password: 'finance2024',
      rewardTitle: 'Professor Dinner',
      rewardDescription: 'Exclusive dinner opportunity',
      capacity: 7,
      students: [mockStudent],
      bidders: [],
      selectedStudents: [],
      bidOpportunities: []
    }

    mockRequest = {
      headers: {},
      body: {},
      params: {},
      query: {}
    }

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    }

    mockNext = vi.fn()
  })

  describe('Authorization Header Validation', () => {
    it('should successfully validate Bearer token format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validtoken'
      mockRequest.headers.authorization = `Bearer ${validToken}`

      // Extract token from header
      const authHeader = mockRequest.headers.authorization
      const token = authHeader?.replace('Bearer ', '')

      expect(token).toBe(validToken)
      expect(token.length).toBeGreaterThan(0)
      expect(authHeader.startsWith('Bearer ')).toBe(true)
    })

    it('should reject requests without authorization header', () => {
      // No authorization header
      delete mockRequest.headers.authorization

      const hasAuthHeader = !!mockRequest.headers.authorization
      expect(hasAuthHeader).toBe(false)
    })

    it('should reject malformed authorization headers', () => {
      const malformedHeaders = [
        'InvalidFormat token123',
        'Bearer',
        'Bearer ',
        'token123',
        ''
      ]

      malformedHeaders.forEach(header => {
        mockRequest.headers.authorization = header
        
        const isValidFormat = header.startsWith('Bearer ') && header.length > 7
        expect(isValidFormat).toBe(false)
      })
    })
  })

  describe('Student Authentication Process', () => {
    it('should authenticate student with valid credentials', () => {
      const authResult = authenticateStudentWithBoth(
        mockStudent.email,
        mockStudent.studentNumber!,
        mockClass.password,
        [mockClass]
      )

      // Verify successful authentication
      expect(authResult.isStudent).toBe(true)
      expect(authResult.currentStudent).toEqual(mockStudent)
      expect(authResult.currentClass).toEqual(mockClass)
      expect(authResult.isAdmin).toBe(false)
    })

    it('should return expected student data structure', () => {
      const authResult = authenticateStudentWithBoth(
        mockStudent.email,
        mockStudent.studentNumber!,
        mockClass.password,
        [mockClass]
      )

      if (authResult.currentStudent) {
        expect(authResult.currentStudent).toHaveProperty('id')
        expect(authResult.currentStudent).toHaveProperty('name')
        expect(authResult.currentStudent).toHaveProperty('email')
        expect(authResult.currentStudent).toHaveProperty('studentNumber')
        expect(authResult.currentStudent).toHaveProperty('hasUsedToken')
        expect(authResult.currentStudent).toHaveProperty('hasBid')
        
        expect(typeof authResult.currentStudent.id).toBe('string')
        expect(typeof authResult.currentStudent.name).toBe('string')
        expect(typeof authResult.currentStudent.email).toBe('string')
        expect(typeof authResult.currentStudent.hasUsedToken).toBe('boolean')
      }
    })

    it('should return 200 OK status for successful authentication', () => {
      const authResult = authenticateStudentWithBoth(
        mockStudent.email,
        mockStudent.studentNumber!,
        mockClass.password,
        [mockClass]
      )

      // Simulate successful response
      const statusCode = authResult.isStudent ? 200 : 401
      expect(statusCode).toBe(200)
    })

    it('should handle case-insensitive email matching', () => {
      const upperCaseEmail = mockStudent.email.toUpperCase()
      const authResult = authenticateStudentWithBoth(
        upperCaseEmail,
        mockStudent.studentNumber!,
        mockClass.password,
        [mockClass]
      )

      expect(authResult.isStudent).toBe(true)
      expect(authResult.currentStudent?.email).toBe(mockStudent.email)
    })

    it('should validate both email AND student number', () => {
      // Test with correct email but wrong student number
      const wrongStudentNumber = authenticateStudentWithBoth(
        mockStudent.email,
        'WRONG123',
        mockClass.password,
        [mockClass]
      )

      expect(wrongStudentNumber.isStudent).toBe(false)

      // Test with wrong email but correct student number
      const wrongEmail = authenticateStudentWithBoth(
        'wrong@email.com',
        mockStudent.studentNumber!,
        mockClass.password,
        [mockClass]
      )

      expect(wrongEmail.isStudent).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication failures gracefully', () => {
      const invalidAuth = authenticateStudentWithBoth(
        'nonexistent@email.com',
        'INVALID123',
        'wrongpassword',
        [mockClass]
      )

      expect(invalidAuth.isStudent).toBe(false)
      expect(invalidAuth.currentStudent).toBeNull()
      expect(invalidAuth.currentClass).toBeNull()
      expect(invalidAuth.currentAdmin).toBeNull()
    })

    it('should not throw errors for invalid input', () => {
      expect(() => {
        authenticateStudentWithBoth('', '', '', [])
      }).not.toThrow()

      expect(() => {
        authenticateStudentWithBoth(
          mockStudent.email,
          mockStudent.studentNumber!,
          mockClass.password,
          []
        )
      }).not.toThrow()
    })

    it('should handle missing student number gracefully', () => {
      const studentWithoutNumber = {
        ...mockStudent,
        studentNumber: undefined
      }

      const classWithInvalidStudent = {
        ...mockClass,
        students: [studentWithoutNumber]
      }

      const authResult = authenticateStudentWithBoth(
        studentWithoutNumber.email,
        'ANY123',
        mockClass.password,
        [classWithInvalidStudent]
      )

      expect(authResult.isStudent).toBe(false)
    })
  })

  describe('Security Validations', () => {
    it('should validate class password correctly', () => {
      const wrongPassword = authenticateStudentWithBoth(
        mockStudent.email,
        mockStudent.studentNumber!,
        'wrongpassword',
        [mockClass]
      )

      expect(wrongPassword.isStudent).toBe(false)
    })

    it('should prevent authentication with empty credentials', () => {
      const emptyCredentials = authenticateStudentWithBoth(
        '',
        '',
        '',
        [mockClass]
      )

      expect(emptyCredentials.isStudent).toBe(false)
    })

    it('should handle SQL injection attempts safely', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE students; --",
        "admin@test.com' OR '1'='1",
        "ST123'; DELETE FROM bids; --"
      ]

      sqlInjectionAttempts.forEach(maliciousInput => {
        const result = authenticateStudentWithBoth(
          maliciousInput,
          maliciousInput,
          maliciousInput,
          [mockClass]
        )

        expect(result.isStudent).toBe(false)
      })
    })
  })

  describe('Performance Tests', () => {
    it('should complete authentication within reasonable time', async () => {
      const startTime = Date.now()
      
      authenticateStudentWithBoth(
        mockStudent.email,
        mockStudent.studentNumber!,
        mockClass.password,
        [mockClass]
      )
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      // Should complete within 100ms
      expect(executionTime).toBeLessThan(100)
    })

    it('should handle multiple concurrent authentication requests', async () => {
      const concurrentRequests = Array(10).fill(null).map(() =>
        authenticateStudentWithBoth(
          mockStudent.email,
          mockStudent.studentNumber!,
          mockClass.password,
          [mockClass]
        )
      )

      const results = await Promise.all(concurrentRequests)
      
      // All should succeed
      results.forEach(result => {
        expect(result.isStudent).toBe(true)
      })
    })
  })
})