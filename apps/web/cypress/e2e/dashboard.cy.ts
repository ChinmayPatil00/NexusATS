describe('Kanban Dashboard', () => {
  beforeEach(() => {
    // Navigate to the local dashboard
    cy.visit('http://localhost:3000');
  });

  it('should display the main title and columns', () => {
    cy.contains('h1', 'Job Aggregator ATS').should('be.visible');
    
    // Check that all Kanban columns are present
    cy.contains('h2', 'New Postings').should('be.visible');
    cy.contains('h2', 'Applied').should('be.visible');
    cy.contains('h2', 'Interviewing').should('be.visible');
    cy.contains('h2', 'Offer').should('be.visible');
  });

  it('should move a job to the Applied column when clicked', () => {
    // Intercept the API patch request
    cy.intercept('PATCH', '/api/jobs/*/state').as('updateJobState');

    // Assuming there is a job in "New Postings"
    cy.contains('h3', 'Senior Software Engineer').parents('.bg-gray-800').within(() => {
      cy.contains('button', 'Move →').click();
    });

    // Check if the API was called (mocked in our app currently)
    // cy.wait('@updateJobState').its('request.body.state').should('eq', 'APPLIED');
    
    // In our mocked UI state, the job should now be under Applied
    cy.contains('h2', 'Applied').parent().within(() => {
      cy.contains('h3', 'Senior Software Engineer').should('be.visible');
    });
  });
});
