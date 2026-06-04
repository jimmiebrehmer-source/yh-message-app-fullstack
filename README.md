# yh-message-app-fullstack
## Security Improvements

### Authentication

Added authentication middleware to protected endpoints.

### Authorization

Added ownership validation before deleting messages.

### Input Validation

Added minlength and maxlength validation for messages.

### OWASP Mapping

* A01 Broken Access Control
* A05 Security Misconfiguration

### Security Principles

* Least Privilege
* Defense in Depth
* Secure Authentication
