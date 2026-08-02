--
-- PostgreSQL database dump
--

\restrict 5hhOL9jMPp0awjZXKpOV7V5vUCKXEqBPyy3eC0tzJ6dtPyeqAPxGmmIABBilt4e

-- Dumped from database version 16.14 (b253d90)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _system; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA _system;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: replit_database_migrations_v1; Type: TABLE; Schema: _system; Owner: -
--

CREATE TABLE _system.replit_database_migrations_v1 (
    id bigint NOT NULL,
    build_id text NOT NULL,
    deployment_id text NOT NULL,
    statement_count bigint NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE; Schema: _system; Owner: -
--

CREATE SEQUENCE _system.replit_database_migrations_v1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE OWNED BY; Schema: _system; Owner: -
--

ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNED BY _system.replit_database_migrations_v1.id;


--
-- Name: access_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_audit_log (
    id integer NOT NULL,
    screen_key text NOT NULL,
    role_key text NOT NULL,
    previous_level text,
    new_level text NOT NULL,
    changed_by_user_id integer,
    changed_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: access_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.access_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: access_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.access_audit_log_id_seq OWNED BY public.access_audit_log.id;


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    name text NOT NULL,
    industry text,
    website text,
    phone text,
    email text,
    address text,
    city text,
    country text,
    employees integer,
    annual_revenue numeric(15,2),
    description text,
    owner_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text,
    stage text,
    amount numeric(15,2),
    close_date text,
    probability integer,
    forecast_category text,
    next_step text,
    opty_owner text,
    opty_team text,
    created_by integer,
    modified_by integer,
    clm_enabled boolean DEFAULT false NOT NULL,
    org_id integer NOT NULL
);


--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    description text,
    status text DEFAULT 'planned'::text NOT NULL,
    due_date timestamp without time zone,
    completed_at timestamp without time zone,
    contact_id integer,
    opportunity_id integer,
    account_id integer,
    assigned_to integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    lead_id integer,
    org_id integer NOT NULL
);


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    org_id integer DEFAULT 1 NOT NULL,
    key text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: allowed_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allowed_users (
    id integer NOT NULL,
    email text NOT NULL,
    name text,
    role text DEFAULT 'sales'::text NOT NULL,
    google_id text,
    avatar_url text,
    added_by_email text,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer NOT NULL
);


--
-- Name: allowed_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allowed_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allowed_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allowed_users_id_seq OWNED BY public.allowed_users.id;


--
-- Name: app_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_modules (
    key text NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    is_core boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: approval_audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_audit_events (
    id integer NOT NULL,
    request_id integer NOT NULL,
    event text NOT NULL,
    actor_user_id integer,
    actor_name text,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: approval_audit_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_audit_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_audit_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_audit_events_id_seq OWNED BY public.approval_audit_events.id;


--
-- Name: approval_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_configs (
    id integer NOT NULL,
    entity text NOT NULL,
    multi_level boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: approval_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_configs_id_seq OWNED BY public.approval_configs.id;


--
-- Name: approval_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_criteria (
    id integer NOT NULL,
    entity text NOT NULL,
    name text NOT NULL,
    field text NOT NULL,
    operator text NOT NULL,
    threshold numeric(18,4),
    threshold_text text,
    level integer DEFAULT 1 NOT NULL,
    role_id integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: approval_criteria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_criteria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_criteria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_criteria_id_seq OWNED BY public.approval_criteria.id;


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_requests (
    id integer NOT NULL,
    entity text NOT NULL,
    entity_id integer NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    role_id integer,
    requested_by integer,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    decided_by integer,
    decided_at timestamp without time zone,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    criterion_id integer,
    rule_key text,
    org_id integer
);


--
-- Name: approval_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_requests_id_seq OWNED BY public.approval_requests.id;


--
-- Name: approval_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_roles (
    id integer NOT NULL,
    name text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: approval_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_roles_id_seq OWNED BY public.approval_roles.id;


--
-- Name: campaign_engagements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_engagements (
    id integer NOT NULL,
    campaign_id integer,
    platform text NOT NULL,
    event_type text NOT NULL,
    engagement_score integer DEFAULT 1 NOT NULL,
    interest_category text DEFAULT 'cold'::text NOT NULL,
    lead_id integer,
    contact_id integer,
    platform_user_id text,
    platform_user_name text,
    platform_user_email text,
    platform_user_phone text,
    anonymous_id text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    metadata jsonb,
    raw_payload jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: campaign_engagements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_engagements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_engagements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_engagements_id_seq OWNED BY public.campaign_engagements.id;


--
-- Name: campaign_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_members (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    contact_id integer,
    lead_id integer,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    company_name text,
    role text,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp without time zone,
    opened_at timestamp without time zone,
    clicked_at timestamp without time zone,
    bounced_at timestamp without time zone,
    unsubscribed_at timestamp without time zone,
    source text DEFAULT 'manual'::text NOT NULL,
    added_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: campaign_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_members_id_seq OWNED BY public.campaign_members.id;


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'email'::text NOT NULL,
    status text DEFAULT 'planning'::text NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    budget numeric(15,2),
    actual_cost numeric(15,2),
    expected_revenue numeric(15,2),
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    target_audience text,
    channels text,
    team_members text,
    goals text,
    launched_at timestamp without time zone,
    org_id integer NOT NULL
);


--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cases (
    id integer NOT NULL,
    case_number text NOT NULL,
    subject text NOT NULL,
    description text,
    status text DEFAULT 'new'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    type text,
    origin text,
    contact_id integer,
    account_id integer,
    assigned_to integer,
    resolution text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer NOT NULL
);


--
-- Name: cases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cases_id_seq OWNED BY public.cases.id;


--
-- Name: clm_notification_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clm_notification_rules (
    id integer NOT NULL,
    name text NOT NULL,
    event text NOT NULL,
    recipients text DEFAULT '[]'::text NOT NULL,
    channels text DEFAULT '["email"]'::text NOT NULL,
    trigger_days_before integer,
    message_template text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: clm_notification_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clm_notification_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clm_notification_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clm_notification_rules_id_seq OWNED BY public.clm_notification_rules.id;


--
-- Name: clm_redlines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clm_redlines (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    author_id integer,
    round integer DEFAULT 1 NOT NULL,
    section text,
    original_text text,
    proposed_text text,
    change_type text DEFAULT 'modification'::text NOT NULL,
    party text DEFAULT 'counterparty'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: clm_redlines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clm_redlines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clm_redlines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clm_redlines_id_seq OWNED BY public.clm_redlines.id;


--
-- Name: clm_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clm_reviews (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    reviewer_id integer,
    stage text DEFAULT 'legal'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    decision text,
    due_date date,
    decision_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: clm_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clm_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clm_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clm_reviews_id_seq OWNED BY public.clm_reviews.id;


--
-- Name: clm_signers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clm_signers (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    title text,
    role text DEFAULT 'signer'::text NOT NULL,
    signing_order integer DEFAULT 1 NOT NULL,
    party text DEFAULT 'counterparty'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    signed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: clm_signers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clm_signers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clm_signers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clm_signers_id_seq OWNED BY public.clm_signers.id;


--
-- Name: clm_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clm_templates (
    id integer NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'MSA'::text NOT NULL,
    description text,
    content text,
    variables text DEFAULT '[]'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: clm_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clm_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clm_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clm_templates_id_seq OWNED BY public.clm_templates.id;


--
-- Name: clm_workflow_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clm_workflow_rules (
    id integer NOT NULL,
    name text NOT NULL,
    trigger_event text NOT NULL,
    conditions text DEFAULT '[]'::text NOT NULL,
    actions text DEFAULT '[]'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: clm_workflow_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clm_workflow_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clm_workflow_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clm_workflow_rules_id_seq OWNED BY public.clm_workflow_rules.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    mobile text,
    title text,
    department text,
    account_id integer,
    owner_id integer,
    lead_source text,
    address text,
    city text,
    country text,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer NOT NULL
);


--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: contract_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_documents (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    version integer NOT NULL,
    title text,
    content text NOT NULL,
    change_summary text,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: contract_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_documents_id_seq OWNED BY public.contract_documents.id;


--
-- Name: contract_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_line_items (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    product_id integer,
    product_name text NOT NULL,
    quantity numeric(10,2) DEFAULT '1'::numeric NOT NULL,
    list_price numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: contract_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_line_items_id_seq OWNED BY public.contract_line_items.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
    contract_number text NOT NULL,
    name text NOT NULL,
    account_id integer,
    contact_id integer,
    opportunity_id integer,
    price_book_id integer,
    owner_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date timestamp without time zone,
    contract_term_months integer,
    end_date timestamp without time zone,
    signed_date timestamp without time zone,
    company_signed_by_id integer,
    customer_signed_by_contact_id integer,
    auto_renew boolean DEFAULT false NOT NULL,
    renewal_term_months integer,
    special_terms text,
    description text,
    subtotal numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    activated_at timestamp without time zone,
    terminated_at timestamp without time zone,
    termination_reason text,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    contract_type text,
    territory text,
    business_unit text,
    priority text DEFAULT 'Medium'::text,
    governing_law text,
    payment_terms text,
    liability_cap_multiplier numeric,
    confidentiality_period_years integer,
    ip_ownership text,
    termination_notice_days integer,
    counterparty_company text,
    counterparty_signer_name text,
    counterparty_signer_email text,
    counterparty_signer_title text,
    counterparty_address text,
    signing_provider text,
    signing_order text DEFAULT 'Sequential'::text,
    signing_deadline date,
    renewal_status text,
    renewal_decision_date date,
    renewal_window_days integer DEFAULT 90,
    arr_at_risk numeric,
    yearly_escalation_pct numeric,
    minimum_annual_commit numeric,
    risk_score integer,
    redline_round integer DEFAULT 0,
    template_id integer,
    org_id integer NOT NULL
);


--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: email_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_attachments (
    id integer NOT NULL,
    tracking_id integer NOT NULL,
    token text NOT NULL,
    filename text NOT NULL,
    content_type text,
    size_bytes integer DEFAULT 0 NOT NULL,
    content bytea NOT NULL,
    open_count integer DEFAULT 0 NOT NULL,
    opened_at timestamp without time zone,
    last_opened_at timestamp without time zone,
    last_ip text,
    last_user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: email_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_attachments_id_seq OWNED BY public.email_attachments.id;


--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_settings (
    id integer NOT NULL,
    imap_host text DEFAULT 'mail.spacemail.com'::text NOT NULL,
    imap_port integer DEFAULT 993 NOT NULL,
    imap_user text,
    imap_password text,
    imap_secure boolean DEFAULT true NOT NULL,
    smtp_host text DEFAULT 'mail.spacemail.com'::text NOT NULL,
    smtp_port integer DEFAULT 465 NOT NULL,
    smtp_user text,
    smtp_password text,
    smtp_secure boolean DEFAULT true NOT NULL,
    smtp_from_name text,
    sync_enabled boolean DEFAULT false NOT NULL,
    sync_interval_minutes integer DEFAULT 15 NOT NULL,
    last_sync_at timestamp without time zone,
    last_sync_status text,
    last_sync_message text,
    emails_processed integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: email_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_settings_id_seq OWNED BY public.email_settings.id;


--
-- Name: email_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_tracking (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    token text NOT NULL,
    to_email text,
    subject text,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    opened_at timestamp without time zone,
    last_opened_at timestamp without time zone,
    open_count integer DEFAULT 0 NOT NULL,
    last_ip text,
    last_user_agent text,
    message_id text,
    org_id integer
);


--
-- Name: email_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_tracking_id_seq OWNED BY public.email_tracking.id;


--
-- Name: emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emails (
    id integer NOT NULL,
    from_email text NOT NULL,
    from_name text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    related_contact_id integer,
    related_lead_id integer,
    related_opportunity_id integer,
    is_known_customer text DEFAULT 'false'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    message_uid text,
    body_html text,
    auto_replied_at timestamp without time zone,
    message_id text,
    in_reply_to text,
    org_id integer
);


--
-- Name: emails_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emails_id_seq OWNED BY public.emails.id;


--
-- Name: enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enquiries (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: enquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: enquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enquiries_id_seq OWNED BY public.enquiries.id;


--
-- Name: entity_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_notes (
    id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    attachment_name text,
    attachment_url text,
    created_by integer,
    created_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: entity_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_notes_id_seq OWNED BY public.entity_notes.id;


--
-- Name: integration_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_audit_log (
    id integer NOT NULL,
    actor_id integer,
    actor_name text,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    before_state jsonb,
    after_state jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_audit_log_id_seq OWNED BY public.integration_audit_log.id;


--
-- Name: integration_mapping_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_mapping_templates (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    entity_type text NOT NULL,
    version integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    definition jsonb NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    activated_at timestamp without time zone
);


--
-- Name: integration_mapping_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_mapping_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_mapping_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_mapping_templates_id_seq OWNED BY public.integration_mapping_templates.id;


--
-- Name: integration_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_partners (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    webhook_secret_encrypted text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    allow_public_form boolean DEFAULT false NOT NULL
);


--
-- Name: integration_partners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_partners_id_seq OWNED BY public.integration_partners.id;


--
-- Name: integration_run_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_run_log (
    id integer NOT NULL,
    partner_id integer,
    template_id integer,
    entity_type text NOT NULL,
    status text NOT NULL,
    request_payload jsonb,
    mapped_output jsonb,
    errors jsonb,
    crm_entity_id integer,
    duration_ms integer DEFAULT 0 NOT NULL,
    correlation_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_run_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.integration_run_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: integration_run_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.integration_run_log_id_seq OWNED BY public.integration_run_log.id;


--
-- Name: lead_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_attachments (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    file_name text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    file_type text DEFAULT ''::text NOT NULL,
    file_data text NOT NULL,
    uploaded_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: lead_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_attachments_id_seq OWNED BY public.lead_attachments.id;


--
-- Name: lead_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_contacts (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    contact_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: lead_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_contacts_id_seq OWNED BY public.lead_contacts.id;


--
-- Name: lead_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_insights (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    company_size text,
    industry_segment text,
    product_summary text,
    recent_news text,
    hiring_trend text,
    tech_stack text,
    social_presence text,
    sentiment text,
    growth_indicators text[],
    buying_intent_signals text[],
    ai_score_boost integer DEFAULT 0 NOT NULL,
    buyer_classification text DEFAULT 'medium_potential'::text NOT NULL,
    confidence text DEFAULT 'low'::text NOT NULL,
    raw_insights jsonb,
    analysis_summary text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    ceo_name text,
    ceo_title text,
    ceo_linkedin text,
    headquarters text,
    founded_year text,
    estimated_market_value text,
    funding_stage text,
    key_competitors text[],
    recent_achievements text[],
    linkedin_url text,
    twitter_handle text,
    facebook_url text,
    instagram_handle text,
    youtube_url text,
    best_contact_name text,
    best_contact_title text,
    best_contact_email text,
    email_pattern text,
    blog_url text,
    org_id integer
);


--
-- Name: lead_insights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_insights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_insights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_insights_id_seq OWNED BY public.lead_insights.id;


--
-- Name: lead_score_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_score_milestones (
    id integer NOT NULL,
    label text NOT NULL,
    min_score integer NOT NULL,
    max_score integer NOT NULL,
    color text DEFAULT 'gray'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: lead_score_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_score_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_score_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_score_milestones_id_seq OWNED BY public.lead_score_milestones.id;


--
-- Name: lead_scoring_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_scoring_rules (
    id integer NOT NULL,
    rule_type text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    description text,
    points integer DEFAULT 0 NOT NULL,
    params jsonb,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: lead_scoring_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_scoring_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_scoring_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_scoring_rules_id_seq OWNED BY public.lead_scoring_rules.id;


--
-- Name: lead_stage_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_stage_history (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    stage text NOT NULL,
    entered_at timestamp without time zone DEFAULT now() NOT NULL,
    left_at timestamp without time zone
);


--
-- Name: lead_stage_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_stage_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_stage_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_stage_history_id_seq OWNED BY public.lead_stage_history.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    company text,
    title text,
    status text DEFAULT 'new'::text NOT NULL,
    source text,
    score integer,
    annual_revenue numeric(15,2),
    employees integer,
    industry text,
    description text,
    assigned_to integer,
    is_converted boolean DEFAULT false NOT NULL,
    converted_contact_id integer,
    converted_account_id integer,
    converted_opportunity_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    buyer_classification text,
    insights_generated_at timestamp without time zone,
    website text,
    org_id integer NOT NULL
);


--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities (
    id integer NOT NULL,
    name text NOT NULL,
    account_id integer,
    contact_id integer,
    stage text DEFAULT 'prospecting'::text NOT NULL,
    amount numeric(15,2),
    probability integer,
    close_date timestamp without time zone,
    description text,
    assigned_to integer,
    lead_source text,
    next_step text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    forecast_category text,
    team_members text,
    price_book_id integer,
    org_id integer NOT NULL
);


--
-- Name: opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opportunities_id_seq OWNED BY public.opportunities.id;


--
-- Name: opportunity_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_attachments (
    id integer NOT NULL,
    opportunity_id integer NOT NULL,
    file_name text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    file_type text DEFAULT ''::text NOT NULL,
    file_data text NOT NULL,
    uploaded_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: opportunity_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opportunity_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opportunity_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opportunity_attachments_id_seq OWNED BY public.opportunity_attachments.id;


--
-- Name: opportunity_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_items (
    id integer NOT NULL,
    opportunity_id integer NOT NULL,
    product_id integer,
    product_name text NOT NULL,
    quantity numeric(15,2) DEFAULT '1'::numeric NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    price_book_entry_id integer,
    org_id integer
);


--
-- Name: opportunity_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opportunity_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opportunity_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opportunity_items_id_seq OWNED BY public.opportunity_items.id;


--
-- Name: opportunity_stage_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_stage_history (
    id integer NOT NULL,
    opportunity_id integer NOT NULL,
    stage text NOT NULL,
    entered_at timestamp without time zone DEFAULT now() NOT NULL,
    left_at timestamp without time zone,
    org_id integer
);


--
-- Name: opportunity_stage_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opportunity_stage_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opportunity_stage_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opportunity_stage_history_id_seq OWNED BY public.opportunity_stage_history.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer,
    product_name text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number text NOT NULL,
    quote_id integer,
    opportunity_id integer,
    contact_id integer,
    account_id integer,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    order_date timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by_user_id integer,
    org_id integer NOT NULL
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: price_book_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_book_entries (
    id integer NOT NULL,
    price_book_id integer NOT NULL,
    product_id integer NOT NULL,
    list_price numeric(15,2) NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    use_standard_price boolean DEFAULT false NOT NULL,
    org_id integer
);


--
-- Name: price_book_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_book_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_book_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_book_entries_id_seq OWNED BY public.price_book_entries.id;


--
-- Name: price_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_books (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    is_standard boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: price_books_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_books_id_seq OWNED BY public.price_books.id;


--
-- Name: product_bundle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_bundle_items (
    id integer NOT NULL,
    bundle_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_price_override numeric,
    discount_pct numeric DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: product_bundle_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_bundle_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_bundle_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_bundle_items_id_seq OWNED BY public.product_bundle_items.id;


--
-- Name: product_bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_bundles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    bundle_discount_pct numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: product_bundles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_bundles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_bundles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_bundles_id_seq OWNED BY public.product_bundles.id;


--
-- Name: product_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_rules (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    scope text DEFAULT 'Product'::text NOT NULL,
    conditions_met text DEFAULT 'All'::text NOT NULL,
    conditions text DEFAULT '[]'::text NOT NULL,
    actions text DEFAULT '[]'::text NOT NULL,
    error_message text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: product_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_rules_id_seq OWNED BY public.product_rules.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    unit_price numeric(15,2) NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    category text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cost_price numeric,
    quantity_unit_of_measure text,
    org_id integer
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: quote_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_attachments (
    id integer NOT NULL,
    quote_id integer NOT NULL,
    file_name text NOT NULL,
    file_size integer DEFAULT 0 NOT NULL,
    file_type text DEFAULT ''::text NOT NULL,
    file_data text NOT NULL,
    uploaded_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: quote_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_attachments_id_seq OWNED BY public.quote_attachments.id;


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id integer NOT NULL,
    quote_id integer NOT NULL,
    product_id integer,
    product_name text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    price_book_entry_id integer,
    bundle_id integer,
    bundle_name text,
    cost_price numeric,
    margin_pct numeric,
    org_id integer
);


--
-- Name: quote_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_items_id_seq OWNED BY public.quote_items.id;


--
-- Name: quote_stage_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_stage_config (
    id integer NOT NULL,
    stage_id text NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    "position" integer DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_stage_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_stage_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_stage_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_stage_config_id_seq OWNED BY public.quote_stage_config.id;


--
-- Name: quote_stage_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_stage_history (
    id integer NOT NULL,
    quote_id integer NOT NULL,
    stage text NOT NULL,
    entered_at timestamp without time zone DEFAULT now() NOT NULL,
    left_at timestamp without time zone
);


--
-- Name: quote_stage_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_stage_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_stage_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_stage_history_id_seq OWNED BY public.quote_stage_history.id;


--
-- Name: quote_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_team_members (
    id integer NOT NULL,
    quote_id integer NOT NULL,
    user_id integer NOT NULL,
    role text DEFAULT 'Team Member'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: quote_team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_team_members_id_seq OWNED BY public.quote_team_members.id;


--
-- Name: quote_workflow_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_workflow_rules (
    id integer NOT NULL,
    stage text NOT NULL,
    rule_type text NOT NULL,
    activity_type text,
    activity_title text,
    activity_due_days integer DEFAULT 1,
    assign_to_role text,
    assign_to_user_id integer,
    approval_required boolean DEFAULT false,
    approval_email_subject text,
    approval_email_body text,
    approver_role text,
    approver_user_id integer,
    advance_to_stage text,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT quote_workflow_rules_rule_type_check CHECK ((rule_type = ANY (ARRAY['activity'::text, 'approval'::text])))
);


--
-- Name: quote_workflow_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_workflow_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_workflow_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_workflow_rules_id_seq OWNED BY public.quote_workflow_rules.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    quote_number text NOT NULL,
    name text NOT NULL,
    opportunity_id integer,
    contact_id integer,
    account_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    valid_until timestamp without time zone,
    subtotal numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    parent_quote_id integer,
    cloned_from_quote_id integer,
    created_by_user_id integer,
    created_by_name text,
    created_by_email text,
    price_book_id integer,
    org_id integer NOT NULL,
    rejection_reason text
);


--
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- Name: record_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.record_access (
    id integer NOT NULL,
    record_type_key text NOT NULL,
    role_key text NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_read_only boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: record_access_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.record_access_audit_log (
    id integer NOT NULL,
    record_type_key text NOT NULL,
    role_key text NOT NULL,
    previous_permissions jsonb,
    new_permissions jsonb NOT NULL,
    changed_by_user_id integer,
    changed_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: record_access_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.record_access_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: record_access_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.record_access_audit_log_id_seq OWNED BY public.record_access_audit_log.id;


--
-- Name: record_access_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.record_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: record_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.record_access_id_seq OWNED BY public.record_access.id;


--
-- Name: record_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.record_types (
    key text NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    org_id integer
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    key text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    org_id integer
);


--
-- Name: screen_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screen_access (
    id integer NOT NULL,
    screen_key text NOT NULL,
    role_key text NOT NULL,
    access_level text DEFAULT 'none'::text NOT NULL,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: screen_access_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.screen_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: screen_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.screen_access_id_seq OWNED BY public.screen_access.id;


--
-- Name: screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screens (
    key text NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    org_id integer
);


--
-- Name: social_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_messages (
    id integer NOT NULL,
    lead_id integer,
    contact_id integer,
    sent_by_user_id integer,
    platform text NOT NULL,
    direction text NOT NULL,
    content text NOT NULL,
    media_url text,
    media_type text,
    sender_name text,
    sender_handle text,
    sender_avatar_url text,
    platform_message_id text,
    platform_thread_id text,
    platform_profile_url text,
    status text DEFAULT 'sent'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer
);


--
-- Name: social_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.social_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: social_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.social_messages_id_seq OWNED BY public.social_messages.id;


--
-- Name: stims_attainment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_attainment (
    id integer NOT NULL,
    user_id integer NOT NULL,
    fiscal_period_id integer,
    actual_amount numeric DEFAULT 0 NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_attainment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_attainment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_attainment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_attainment_id_seq OWNED BY public.stims_attainment.id;


--
-- Name: stims_calc_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_calc_runs (
    id integer NOT NULL,
    fiscal_period_id integer,
    cycle_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    total_payout numeric DEFAULT 0,
    approved_by integer,
    run_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_calc_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_calc_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_calc_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_calc_runs_id_seq OWNED BY public.stims_calc_runs.id;


--
-- Name: stims_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_disputes (
    id integer NOT NULL,
    payout_line_id integer,
    user_id integer NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolution text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_disputes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_disputes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_disputes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_disputes_id_seq OWNED BY public.stims_disputes.id;


--
-- Name: stims_fiscal_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_fiscal_periods (
    id integer NOT NULL,
    name text NOT NULL,
    fiscal_year integer NOT NULL,
    period_type text DEFAULT 'monthly'::text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_fiscal_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_fiscal_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_fiscal_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_fiscal_periods_id_seq OWNED BY public.stims_fiscal_periods.id;


--
-- Name: stims_incentive_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_incentive_plans (
    id integer NOT NULL,
    name text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    effective_start date,
    effective_end date,
    currency text DEFAULT 'GBP'::text NOT NULL,
    base_variable_split numeric DEFAULT 30 NOT NULL,
    ote_amount numeric DEFAULT 0 NOT NULL,
    payout_frequency text DEFAULT 'quarterly'::text NOT NULL,
    threshold_pct numeric DEFAULT 70 NOT NULL,
    cap_pct numeric,
    measure text DEFAULT 'revenue'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_incentive_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_incentive_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_incentive_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_incentive_plans_id_seq OWNED BY public.stims_incentive_plans.id;


--
-- Name: stims_payout_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_payout_lines (
    id integer NOT NULL,
    run_id integer NOT NULL,
    user_id integer NOT NULL,
    quota numeric DEFAULT 0 NOT NULL,
    actual numeric DEFAULT 0 NOT NULL,
    attainment_pct numeric DEFAULT 0 NOT NULL,
    gross_payout numeric DEFAULT 0 NOT NULL,
    adjustment numeric DEFAULT 0,
    adjustment_reason text,
    net_payout numeric DEFAULT 0 NOT NULL,
    breakdown text,
    exception_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_payout_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_payout_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_payout_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_payout_lines_id_seq OWNED BY public.stims_payout_lines.id;


--
-- Name: stims_plan_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_plan_assignments (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    user_id integer NOT NULL,
    effective_start date,
    effective_end date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_plan_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_plan_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_plan_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_plan_assignments_id_seq OWNED BY public.stims_plan_assignments.id;


--
-- Name: stims_plan_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_plan_tiers (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    label text,
    from_pct numeric NOT NULL,
    to_pct numeric,
    rate_pct numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_plan_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_plan_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_plan_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_plan_tiers_id_seq OWNED BY public.stims_plan_tiers.id;


--
-- Name: stims_quotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_quotas (
    id integer NOT NULL,
    cycle_id integer NOT NULL,
    user_id integer NOT NULL,
    quota_amount numeric DEFAULT 0 NOT NULL,
    ramp_pct numeric DEFAULT 100 NOT NULL,
    is_new_hire boolean DEFAULT false NOT NULL,
    period_breakdowns jsonb,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_quotas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_quotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_quotas_id_seq OWNED BY public.stims_quotas.id;


--
-- Name: stims_ramp_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_ramp_templates (
    id integer NOT NULL,
    name text NOT NULL,
    months_schedule jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_ramp_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_ramp_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_ramp_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_ramp_templates_id_seq OWNED BY public.stims_ramp_templates.id;


--
-- Name: stims_target_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stims_target_cycles (
    id integer NOT NULL,
    name text NOT NULL,
    fiscal_period_id integer,
    metric text DEFAULT 'revenue'::text NOT NULL,
    total_target numeric DEFAULT 0 NOT NULL,
    allocation_method text DEFAULT 'equal'::text NOT NULL,
    scope text DEFAULT 'All'::text NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    growth_pct numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer DEFAULT 1 NOT NULL
);


--
-- Name: stims_target_cycles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stims_target_cycles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stims_target_cycles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stims_target_cycles_id_seq OWNED BY public.stims_target_cycles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'rep'::text NOT NULL,
    team text,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    org_id integer NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: website_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_visits (
    id integer NOT NULL,
    session_id text,
    path text,
    referrer text,
    user_agent text,
    ip_address text,
    visited_at timestamp without time zone DEFAULT now() NOT NULL,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    campaign_id integer,
    org_id integer
);


--
-- Name: website_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.website_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: website_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.website_visits_id_seq OWNED BY public.website_visits.id;


--
-- Name: replit_database_migrations_v1 id; Type: DEFAULT; Schema: _system; Owner: -
--

ALTER TABLE ONLY _system.replit_database_migrations_v1 ALTER COLUMN id SET DEFAULT nextval('_system.replit_database_migrations_v1_id_seq'::regclass);


--
-- Name: access_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_audit_log ALTER COLUMN id SET DEFAULT nextval('public.access_audit_log_id_seq'::regclass);


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: allowed_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_users ALTER COLUMN id SET DEFAULT nextval('public.allowed_users_id_seq'::regclass);


--
-- Name: approval_audit_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_events ALTER COLUMN id SET DEFAULT nextval('public.approval_audit_events_id_seq'::regclass);


--
-- Name: approval_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_configs ALTER COLUMN id SET DEFAULT nextval('public.approval_configs_id_seq'::regclass);


--
-- Name: approval_criteria id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_criteria ALTER COLUMN id SET DEFAULT nextval('public.approval_criteria_id_seq'::regclass);


--
-- Name: approval_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests ALTER COLUMN id SET DEFAULT nextval('public.approval_requests_id_seq'::regclass);


--
-- Name: approval_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_roles ALTER COLUMN id SET DEFAULT nextval('public.approval_roles_id_seq'::regclass);


--
-- Name: campaign_engagements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_engagements ALTER COLUMN id SET DEFAULT nextval('public.campaign_engagements_id_seq'::regclass);


--
-- Name: campaign_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members ALTER COLUMN id SET DEFAULT nextval('public.campaign_members_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: cases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases ALTER COLUMN id SET DEFAULT nextval('public.cases_id_seq'::regclass);


--
-- Name: clm_notification_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_notification_rules ALTER COLUMN id SET DEFAULT nextval('public.clm_notification_rules_id_seq'::regclass);


--
-- Name: clm_redlines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_redlines ALTER COLUMN id SET DEFAULT nextval('public.clm_redlines_id_seq'::regclass);


--
-- Name: clm_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_reviews ALTER COLUMN id SET DEFAULT nextval('public.clm_reviews_id_seq'::regclass);


--
-- Name: clm_signers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_signers ALTER COLUMN id SET DEFAULT nextval('public.clm_signers_id_seq'::regclass);


--
-- Name: clm_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_templates ALTER COLUMN id SET DEFAULT nextval('public.clm_templates_id_seq'::regclass);


--
-- Name: clm_workflow_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_workflow_rules ALTER COLUMN id SET DEFAULT nextval('public.clm_workflow_rules_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: contract_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents ALTER COLUMN id SET DEFAULT nextval('public.contract_documents_id_seq'::regclass);


--
-- Name: contract_line_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_line_items ALTER COLUMN id SET DEFAULT nextval('public.contract_line_items_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: email_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_attachments ALTER COLUMN id SET DEFAULT nextval('public.email_attachments_id_seq'::regclass);


--
-- Name: email_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings ALTER COLUMN id SET DEFAULT nextval('public.email_settings_id_seq'::regclass);


--
-- Name: email_tracking id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking ALTER COLUMN id SET DEFAULT nextval('public.email_tracking_id_seq'::regclass);


--
-- Name: emails id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails ALTER COLUMN id SET DEFAULT nextval('public.emails_id_seq'::regclass);


--
-- Name: enquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries ALTER COLUMN id SET DEFAULT nextval('public.enquiries_id_seq'::regclass);


--
-- Name: entity_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_notes ALTER COLUMN id SET DEFAULT nextval('public.entity_notes_id_seq'::regclass);


--
-- Name: integration_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_audit_log ALTER COLUMN id SET DEFAULT nextval('public.integration_audit_log_id_seq'::regclass);


--
-- Name: integration_mapping_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_mapping_templates ALTER COLUMN id SET DEFAULT nextval('public.integration_mapping_templates_id_seq'::regclass);


--
-- Name: integration_partners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_partners ALTER COLUMN id SET DEFAULT nextval('public.integration_partners_id_seq'::regclass);


--
-- Name: integration_run_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_run_log ALTER COLUMN id SET DEFAULT nextval('public.integration_run_log_id_seq'::regclass);


--
-- Name: lead_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_attachments ALTER COLUMN id SET DEFAULT nextval('public.lead_attachments_id_seq'::regclass);


--
-- Name: lead_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_contacts ALTER COLUMN id SET DEFAULT nextval('public.lead_contacts_id_seq'::regclass);


--
-- Name: lead_insights id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_insights ALTER COLUMN id SET DEFAULT nextval('public.lead_insights_id_seq'::regclass);


--
-- Name: lead_score_milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_score_milestones ALTER COLUMN id SET DEFAULT nextval('public.lead_score_milestones_id_seq'::regclass);


--
-- Name: lead_scoring_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_scoring_rules ALTER COLUMN id SET DEFAULT nextval('public.lead_scoring_rules_id_seq'::regclass);


--
-- Name: lead_stage_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_stage_history ALTER COLUMN id SET DEFAULT nextval('public.lead_stage_history_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: opportunities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities ALTER COLUMN id SET DEFAULT nextval('public.opportunities_id_seq'::regclass);


--
-- Name: opportunity_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_attachments ALTER COLUMN id SET DEFAULT nextval('public.opportunity_attachments_id_seq'::regclass);


--
-- Name: opportunity_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_items ALTER COLUMN id SET DEFAULT nextval('public.opportunity_items_id_seq'::regclass);


--
-- Name: opportunity_stage_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_stage_history ALTER COLUMN id SET DEFAULT nextval('public.opportunity_stage_history_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: price_book_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_book_entries ALTER COLUMN id SET DEFAULT nextval('public.price_book_entries_id_seq'::regclass);


--
-- Name: price_books id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_books ALTER COLUMN id SET DEFAULT nextval('public.price_books_id_seq'::regclass);


--
-- Name: product_bundle_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bundle_items ALTER COLUMN id SET DEFAULT nextval('public.product_bundle_items_id_seq'::regclass);


--
-- Name: product_bundles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bundles ALTER COLUMN id SET DEFAULT nextval('public.product_bundles_id_seq'::regclass);


--
-- Name: product_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rules ALTER COLUMN id SET DEFAULT nextval('public.product_rules_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: quote_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_attachments ALTER COLUMN id SET DEFAULT nextval('public.quote_attachments_id_seq'::regclass);


--
-- Name: quote_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items ALTER COLUMN id SET DEFAULT nextval('public.quote_items_id_seq'::regclass);


--
-- Name: quote_stage_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_stage_config ALTER COLUMN id SET DEFAULT nextval('public.quote_stage_config_id_seq'::regclass);


--
-- Name: quote_stage_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_stage_history ALTER COLUMN id SET DEFAULT nextval('public.quote_stage_history_id_seq'::regclass);


--
-- Name: quote_team_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_team_members ALTER COLUMN id SET DEFAULT nextval('public.quote_team_members_id_seq'::regclass);


--
-- Name: quote_workflow_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_workflow_rules ALTER COLUMN id SET DEFAULT nextval('public.quote_workflow_rules_id_seq'::regclass);


--
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- Name: record_access id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access ALTER COLUMN id SET DEFAULT nextval('public.record_access_id_seq'::regclass);


--
-- Name: record_access_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access_audit_log ALTER COLUMN id SET DEFAULT nextval('public.record_access_audit_log_id_seq'::regclass);


--
-- Name: screen_access id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_access ALTER COLUMN id SET DEFAULT nextval('public.screen_access_id_seq'::regclass);


--
-- Name: social_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_messages ALTER COLUMN id SET DEFAULT nextval('public.social_messages_id_seq'::regclass);


--
-- Name: stims_attainment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_attainment ALTER COLUMN id SET DEFAULT nextval('public.stims_attainment_id_seq'::regclass);


--
-- Name: stims_calc_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_calc_runs ALTER COLUMN id SET DEFAULT nextval('public.stims_calc_runs_id_seq'::regclass);


--
-- Name: stims_disputes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_disputes ALTER COLUMN id SET DEFAULT nextval('public.stims_disputes_id_seq'::regclass);


--
-- Name: stims_fiscal_periods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_fiscal_periods ALTER COLUMN id SET DEFAULT nextval('public.stims_fiscal_periods_id_seq'::regclass);


--
-- Name: stims_incentive_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_incentive_plans ALTER COLUMN id SET DEFAULT nextval('public.stims_incentive_plans_id_seq'::regclass);


--
-- Name: stims_payout_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_payout_lines ALTER COLUMN id SET DEFAULT nextval('public.stims_payout_lines_id_seq'::regclass);


--
-- Name: stims_plan_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_plan_assignments ALTER COLUMN id SET DEFAULT nextval('public.stims_plan_assignments_id_seq'::regclass);


--
-- Name: stims_plan_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_plan_tiers ALTER COLUMN id SET DEFAULT nextval('public.stims_plan_tiers_id_seq'::regclass);


--
-- Name: stims_quotas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_quotas ALTER COLUMN id SET DEFAULT nextval('public.stims_quotas_id_seq'::regclass);


--
-- Name: stims_ramp_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_ramp_templates ALTER COLUMN id SET DEFAULT nextval('public.stims_ramp_templates_id_seq'::regclass);


--
-- Name: stims_target_cycles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_target_cycles ALTER COLUMN id SET DEFAULT nextval('public.stims_target_cycles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: website_visits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_visits ALTER COLUMN id SET DEFAULT nextval('public.website_visits_id_seq'::regclass);


--
-- Name: replit_database_migrations_v1 replit_database_migrations_v1_pkey; Type: CONSTRAINT; Schema: _system; Owner: -
--

ALTER TABLE ONLY _system.replit_database_migrations_v1
    ADD CONSTRAINT replit_database_migrations_v1_pkey PRIMARY KEY (id);


--
-- Name: access_audit_log access_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_audit_log
    ADD CONSTRAINT access_audit_log_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_unique UNIQUE (key);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (org_id, key);


--
-- Name: allowed_users allowed_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_users
    ADD CONSTRAINT allowed_users_email_unique UNIQUE (email);


--
-- Name: allowed_users allowed_users_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_users
    ADD CONSTRAINT allowed_users_google_id_unique UNIQUE (google_id);


--
-- Name: allowed_users allowed_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_users
    ADD CONSTRAINT allowed_users_pkey PRIMARY KEY (id);


--
-- Name: app_modules app_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_modules
    ADD CONSTRAINT app_modules_pkey PRIMARY KEY (key);


--
-- Name: approval_audit_events approval_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_events
    ADD CONSTRAINT approval_audit_events_pkey PRIMARY KEY (id);


--
-- Name: approval_configs approval_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_configs
    ADD CONSTRAINT approval_configs_pkey PRIMARY KEY (id);


--
-- Name: approval_criteria approval_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_criteria
    ADD CONSTRAINT approval_criteria_pkey PRIMARY KEY (id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: approval_roles approval_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_roles
    ADD CONSTRAINT approval_roles_pkey PRIMARY KEY (id);


--
-- Name: campaign_engagements campaign_engagements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_pkey PRIMARY KEY (id);


--
-- Name: campaign_members campaign_members_campaign_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_campaign_id_email_key UNIQUE (campaign_id, email);


--
-- Name: campaign_members campaign_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: cases cases_case_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_case_number_unique UNIQUE (case_number);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: clm_notification_rules clm_notification_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_notification_rules
    ADD CONSTRAINT clm_notification_rules_pkey PRIMARY KEY (id);


--
-- Name: clm_redlines clm_redlines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_redlines
    ADD CONSTRAINT clm_redlines_pkey PRIMARY KEY (id);


--
-- Name: clm_reviews clm_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_reviews
    ADD CONSTRAINT clm_reviews_pkey PRIMARY KEY (id);


--
-- Name: clm_signers clm_signers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_signers
    ADD CONSTRAINT clm_signers_pkey PRIMARY KEY (id);


--
-- Name: clm_templates clm_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_templates
    ADD CONSTRAINT clm_templates_pkey PRIMARY KEY (id);


--
-- Name: clm_workflow_rules clm_workflow_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clm_workflow_rules
    ADD CONSTRAINT clm_workflow_rules_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: contract_documents contract_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_pkey PRIMARY KEY (id);


--
-- Name: contract_line_items contract_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_contract_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_contract_number_unique UNIQUE (contract_number);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: email_attachments email_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_pkey PRIMARY KEY (id);


--
-- Name: email_attachments email_attachments_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_token_unique UNIQUE (token);


--
-- Name: email_settings email_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_pkey PRIMARY KEY (id);


--
-- Name: email_tracking email_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_pkey PRIMARY KEY (id);


--
-- Name: email_tracking email_tracking_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_token_unique UNIQUE (token);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- Name: entity_notes entity_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_pkey PRIMARY KEY (id);


--
-- Name: integration_audit_log integration_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_audit_log
    ADD CONSTRAINT integration_audit_log_pkey PRIMARY KEY (id);


--
-- Name: integration_mapping_templates integration_mapping_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_mapping_templates
    ADD CONSTRAINT integration_mapping_templates_pkey PRIMARY KEY (id);


--
-- Name: integration_partners integration_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_partners
    ADD CONSTRAINT integration_partners_pkey PRIMARY KEY (id);


--
-- Name: integration_partners integration_partners_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_partners
    ADD CONSTRAINT integration_partners_slug_key UNIQUE (slug);


--
-- Name: integration_run_log integration_run_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_run_log
    ADD CONSTRAINT integration_run_log_pkey PRIMARY KEY (id);


--
-- Name: lead_attachments lead_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_attachments
    ADD CONSTRAINT lead_attachments_pkey PRIMARY KEY (id);


--
-- Name: lead_contacts lead_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_pkey PRIMARY KEY (id);


--
-- Name: lead_insights lead_insights_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_insights
    ADD CONSTRAINT lead_insights_lead_id_key UNIQUE (lead_id);


--
-- Name: lead_insights lead_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_insights
    ADD CONSTRAINT lead_insights_pkey PRIMARY KEY (id);


--
-- Name: lead_score_milestones lead_score_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_score_milestones
    ADD CONSTRAINT lead_score_milestones_pkey PRIMARY KEY (id);


--
-- Name: lead_scoring_rules lead_scoring_rules_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_key_key UNIQUE (key);


--
-- Name: lead_scoring_rules lead_scoring_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_pkey PRIMARY KEY (id);


--
-- Name: lead_stage_history lead_stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_stage_history
    ADD CONSTRAINT lead_stage_history_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: opportunity_attachments opportunity_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_attachments
    ADD CONSTRAINT opportunity_attachments_pkey PRIMARY KEY (id);


--
-- Name: opportunity_items opportunity_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_pkey PRIMARY KEY (id);


--
-- Name: opportunity_stage_history opportunity_stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_stage_history
    ADD CONSTRAINT opportunity_stage_history_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: price_book_entries price_book_entries_book_product_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_book_product_unique UNIQUE (price_book_id, product_id);


--
-- Name: price_book_entries price_book_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_pkey PRIMARY KEY (id);


--
-- Name: price_books price_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_books
    ADD CONSTRAINT price_books_pkey PRIMARY KEY (id);


--
-- Name: product_bundle_items product_bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bundle_items
    ADD CONSTRAINT product_bundle_items_pkey PRIMARY KEY (id);


--
-- Name: product_bundles product_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bundles
    ADD CONSTRAINT product_bundles_pkey PRIMARY KEY (id);


--
-- Name: product_rules product_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rules
    ADD CONSTRAINT product_rules_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: quote_attachments quote_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_attachments
    ADD CONSTRAINT quote_attachments_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quote_stage_config quote_stage_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_stage_config
    ADD CONSTRAINT quote_stage_config_pkey PRIMARY KEY (id);


--
-- Name: quote_stage_config quote_stage_config_stage_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_stage_config
    ADD CONSTRAINT quote_stage_config_stage_id_key UNIQUE (stage_id);


--
-- Name: quote_stage_history quote_stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_stage_history
    ADD CONSTRAINT quote_stage_history_pkey PRIMARY KEY (id);


--
-- Name: quote_team_members quote_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_team_members
    ADD CONSTRAINT quote_team_members_pkey PRIMARY KEY (id);


--
-- Name: quote_team_members quote_team_members_quote_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_team_members
    ADD CONSTRAINT quote_team_members_quote_id_user_id_key UNIQUE (quote_id, user_id);


--
-- Name: quote_workflow_rules quote_workflow_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_workflow_rules
    ADD CONSTRAINT quote_workflow_rules_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_number_unique UNIQUE (quote_number);


--
-- Name: record_access_audit_log record_access_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access_audit_log
    ADD CONSTRAINT record_access_audit_log_pkey PRIMARY KEY (id);


--
-- Name: record_access record_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access
    ADD CONSTRAINT record_access_pkey PRIMARY KEY (id);


--
-- Name: record_types record_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_types
    ADD CONSTRAINT record_types_pkey PRIMARY KEY (key);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (key);


--
-- Name: screen_access screen_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_access
    ADD CONSTRAINT screen_access_pkey PRIMARY KEY (id);


--
-- Name: screens screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_pkey PRIMARY KEY (key);


--
-- Name: social_messages social_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_messages
    ADD CONSTRAINT social_messages_pkey PRIMARY KEY (id);


--
-- Name: stims_attainment stims_attainment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_attainment
    ADD CONSTRAINT stims_attainment_pkey PRIMARY KEY (id);


--
-- Name: stims_attainment stims_attainment_user_id_fiscal_period_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_attainment
    ADD CONSTRAINT stims_attainment_user_id_fiscal_period_id_key UNIQUE (user_id, fiscal_period_id);


--
-- Name: stims_calc_runs stims_calc_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_calc_runs
    ADD CONSTRAINT stims_calc_runs_pkey PRIMARY KEY (id);


--
-- Name: stims_disputes stims_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_disputes
    ADD CONSTRAINT stims_disputes_pkey PRIMARY KEY (id);


--
-- Name: stims_fiscal_periods stims_fiscal_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_fiscal_periods
    ADD CONSTRAINT stims_fiscal_periods_pkey PRIMARY KEY (id);


--
-- Name: stims_incentive_plans stims_incentive_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_incentive_plans
    ADD CONSTRAINT stims_incentive_plans_pkey PRIMARY KEY (id);


--
-- Name: stims_payout_lines stims_payout_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_payout_lines
    ADD CONSTRAINT stims_payout_lines_pkey PRIMARY KEY (id);


--
-- Name: stims_plan_assignments stims_plan_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_plan_assignments
    ADD CONSTRAINT stims_plan_assignments_pkey PRIMARY KEY (id);


--
-- Name: stims_plan_assignments stims_plan_assignments_plan_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_plan_assignments
    ADD CONSTRAINT stims_plan_assignments_plan_id_user_id_key UNIQUE (plan_id, user_id);


--
-- Name: stims_plan_tiers stims_plan_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_plan_tiers
    ADD CONSTRAINT stims_plan_tiers_pkey PRIMARY KEY (id);


--
-- Name: stims_quotas stims_quotas_cycle_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_quotas
    ADD CONSTRAINT stims_quotas_cycle_id_user_id_key UNIQUE (cycle_id, user_id);


--
-- Name: stims_quotas stims_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_quotas
    ADD CONSTRAINT stims_quotas_pkey PRIMARY KEY (id);


--
-- Name: stims_ramp_templates stims_ramp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_ramp_templates
    ADD CONSTRAINT stims_ramp_templates_pkey PRIMARY KEY (id);


--
-- Name: stims_target_cycles stims_target_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_target_cycles
    ADD CONSTRAINT stims_target_cycles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: website_visits website_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_visits
    ADD CONSTRAINT website_visits_pkey PRIMARY KEY (id);


--
-- Name: idx_replit_database_migrations_v1_build_id; Type: INDEX; Schema: _system; Owner: -
--

CREATE UNIQUE INDEX idx_replit_database_migrations_v1_build_id ON _system.replit_database_migrations_v1 USING btree (build_id);


--
-- Name: approval_audit_events_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_audit_events_request_idx ON public.approval_audit_events USING btree (request_id);


--
-- Name: approval_configs_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX approval_configs_entity_idx ON public.approval_configs USING btree (entity);


--
-- Name: approval_requests_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_requests_entity_idx ON public.approval_requests USING btree (entity, entity_id);


--
-- Name: approval_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_requests_status_idx ON public.approval_requests USING btree (status);


--
-- Name: approval_roles_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX approval_roles_name_idx ON public.approval_roles USING btree (name);


--
-- Name: ce_campaign_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ce_campaign_id_idx ON public.campaign_engagements USING btree (campaign_id);


--
-- Name: ce_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ce_lead_id_idx ON public.campaign_engagements USING btree (lead_id);


--
-- Name: ce_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ce_occurred_at_idx ON public.campaign_engagements USING btree (occurred_at);


--
-- Name: ce_platform_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ce_platform_idx ON public.campaign_engagements USING btree (platform);


--
-- Name: cm_campaign_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cm_campaign_id_idx ON public.campaign_members USING btree (campaign_id);


--
-- Name: cm_contact_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cm_contact_id_idx ON public.campaign_members USING btree (contact_id);


--
-- Name: cm_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cm_email_idx ON public.campaign_members USING btree (email);


--
-- Name: cm_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cm_lead_id_idx ON public.campaign_members USING btree (lead_id);


--
-- Name: cm_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cm_status_idx ON public.campaign_members USING btree (status);


--
-- Name: contract_documents_contract_version_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contract_documents_contract_version_unique ON public.contract_documents USING btree (contract_id, version);


--
-- Name: email_attachments_tracking_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_attachments_tracking_id_idx ON public.email_attachments USING btree (tracking_id);


--
-- Name: email_tracking_message_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_tracking_message_id_idx ON public.email_tracking USING btree (message_id);


--
-- Name: emails_message_uid_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX emails_message_uid_unique ON public.emails USING btree (message_uid);


--
-- Name: entity_notes_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entity_notes_entity_idx ON public.entity_notes USING btree (entity_type, entity_id);


--
-- Name: imt_partner_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX imt_partner_entity_idx ON public.integration_mapping_templates USING btree (partner_id, entity_type);


--
-- Name: irl_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX irl_created_at_idx ON public.integration_run_log USING btree (created_at);


--
-- Name: irl_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX irl_partner_idx ON public.integration_run_log USING btree (partner_id);


--
-- Name: la_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX la_lead_id_idx ON public.lead_attachments USING btree (lead_id);


--
-- Name: lsh_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lsh_lead_id_idx ON public.lead_stage_history USING btree (lead_id);


--
-- Name: oa_opp_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX oa_opp_id_idx ON public.opportunity_attachments USING btree (opportunity_id);


--
-- Name: oppstagehist_opp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX oppstagehist_opp_idx ON public.opportunity_stage_history USING btree (opportunity_id);


--
-- Name: price_books_single_standard_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX price_books_single_standard_unique ON public.price_books USING btree (is_standard) WHERE (is_standard = true);


--
-- Name: qa_quote_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX qa_quote_id_idx ON public.quote_attachments USING btree (quote_id);


--
-- Name: qsh_quote_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX qsh_quote_id_idx ON public.quote_stage_history USING btree (quote_id);


--
-- Name: qtm_quote_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX qtm_quote_id_idx ON public.quote_team_members USING btree (quote_id);


--
-- Name: qwr_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX qwr_stage_idx ON public.quote_workflow_rules USING btree (stage);


--
-- Name: record_access_type_role_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX record_access_type_role_unique ON public.record_access USING btree (record_type_key, role_key);


--
-- Name: screen_access_screen_role_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX screen_access_screen_role_unique ON public.screen_access USING btree (screen_key, role_key);


--
-- Name: sm_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sm_created_at_idx ON public.social_messages USING btree (created_at);


--
-- Name: sm_lead_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sm_lead_id_idx ON public.social_messages USING btree (lead_id);


--
-- Name: sm_platform_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sm_platform_idx ON public.social_messages USING btree (platform);


--
-- Name: website_visits_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX website_visits_session_id_idx ON public.website_visits USING btree (session_id);


--
-- Name: website_visits_visited_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX website_visits_visited_at_idx ON public.website_visits USING btree (visited_at);


--
-- Name: access_audit_log access_audit_log_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_audit_log
    ADD CONSTRAINT access_audit_log_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: accounts accounts_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: accounts accounts_modified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_modified_by_users_id_fk FOREIGN KEY (modified_by) REFERENCES public.users(id);


--
-- Name: accounts accounts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: accounts accounts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: activities activities_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: activities activities_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: activities activities_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: activities activities_lead_id_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: activities activities_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: activities activities_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: allowed_users allowed_users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_users
    ADD CONSTRAINT allowed_users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: app_modules app_modules_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_modules
    ADD CONSTRAINT app_modules_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: approval_audit_events approval_audit_events_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_events
    ADD CONSTRAINT approval_audit_events_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_audit_events approval_audit_events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_events
    ADD CONSTRAINT approval_audit_events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: approval_audit_events approval_audit_events_request_id_approval_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_audit_events
    ADD CONSTRAINT approval_audit_events_request_id_approval_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.approval_requests(id) ON DELETE CASCADE;


--
-- Name: approval_configs approval_configs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_configs
    ADD CONSTRAINT approval_configs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: approval_criteria approval_criteria_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_criteria
    ADD CONSTRAINT approval_criteria_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: approval_criteria approval_criteria_role_id_approval_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_criteria
    ADD CONSTRAINT approval_criteria_role_id_approval_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.approval_roles(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_criterion_id_approval_criteria_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_criterion_id_approval_criteria_id_fk FOREIGN KEY (criterion_id) REFERENCES public.approval_criteria(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_decided_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_decided_by_users_id_fk FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: approval_requests approval_requests_requested_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_requested_by_users_id_fk FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_role_id_approval_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_role_id_approval_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.approval_roles(id) ON DELETE SET NULL;


--
-- Name: approval_roles approval_roles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_roles
    ADD CONSTRAINT approval_roles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: campaign_engagements campaign_engagements_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: campaign_engagements campaign_engagements_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: campaign_engagements campaign_engagements_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: campaign_engagements campaign_engagements_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: campaign_members campaign_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: campaign_members campaign_members_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_members campaign_members_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: campaign_members campaign_members_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: campaign_members campaign_members_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: campaigns campaigns_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: cases cases_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: cases cases_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: cases cases_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: cases cases_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: contacts contacts_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: contacts contacts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: contacts contacts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: contract_documents contract_documents_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: contract_documents contract_documents_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: contract_documents contract_documents_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: contract_line_items contract_line_items_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: contract_line_items contract_line_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: contract_line_items contract_line_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: contracts contracts_company_signed_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_company_signed_by_id_users_id_fk FOREIGN KEY (company_signed_by_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: contracts contracts_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_customer_signed_by_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_customer_signed_by_contact_id_contacts_id_fk FOREIGN KEY (customer_signed_by_contact_id) REFERENCES public.contacts(id);


--
-- Name: contracts contracts_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: contracts contracts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: contracts contracts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_price_book_id_price_books_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_price_book_id_price_books_id_fk FOREIGN KEY (price_book_id) REFERENCES public.price_books(id) ON DELETE SET NULL;


--
-- Name: email_attachments email_attachments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: email_attachments email_attachments_tracking_id_email_tracking_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_tracking_id_email_tracking_id_fk FOREIGN KEY (tracking_id) REFERENCES public.email_tracking(id) ON DELETE CASCADE;


--
-- Name: email_settings email_settings_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: email_tracking email_tracking_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: email_tracking email_tracking_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: emails emails_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: enquiries enquiries_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: entity_notes entity_notes_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: entity_notes entity_notes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: integration_mapping_templates integration_mapping_templates_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_mapping_templates
    ADD CONSTRAINT integration_mapping_templates_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.integration_partners(id) ON DELETE CASCADE;


--
-- Name: integration_run_log integration_run_log_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_run_log
    ADD CONSTRAINT integration_run_log_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.integration_partners(id) ON DELETE SET NULL;


--
-- Name: lead_attachments lead_attachments_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_attachments
    ADD CONSTRAINT lead_attachments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_contacts lead_contacts_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: lead_contacts lead_contacts_lead_id_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: lead_contacts lead_contacts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: lead_insights lead_insights_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_insights
    ADD CONSTRAINT lead_insights_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_insights lead_insights_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_insights
    ADD CONSTRAINT lead_insights_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: lead_score_milestones lead_score_milestones_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_score_milestones
    ADD CONSTRAINT lead_score_milestones_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: lead_scoring_rules lead_scoring_rules_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: lead_stage_history lead_stage_history_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_stage_history
    ADD CONSTRAINT lead_stage_history_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: leads leads_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: leads leads_converted_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_converted_account_id_accounts_id_fk FOREIGN KEY (converted_account_id) REFERENCES public.accounts(id);


--
-- Name: leads leads_converted_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_converted_contact_id_contacts_id_fk FOREIGN KEY (converted_contact_id) REFERENCES public.contacts(id);


--
-- Name: leads leads_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: opportunities opportunities_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: opportunities opportunities_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: opportunities opportunities_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: opportunities opportunities_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: opportunities opportunities_price_book_id_price_books_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_price_book_id_price_books_id_fk FOREIGN KEY (price_book_id) REFERENCES public.price_books(id) ON DELETE SET NULL;


--
-- Name: opportunity_attachments opportunity_attachments_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_attachments
    ADD CONSTRAINT opportunity_attachments_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_items opportunity_items_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: opportunity_items opportunity_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: opportunity_items opportunity_items_price_book_entry_id_price_book_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_price_book_entry_id_price_book_entries_id_fk FOREIGN KEY (price_book_entry_id) REFERENCES public.price_book_entries(id) ON DELETE SET NULL;


--
-- Name: opportunity_items opportunity_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: opportunity_stage_history opportunity_stage_history_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_stage_history
    ADD CONSTRAINT opportunity_stage_history_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_stage_history opportunity_stage_history_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_stage_history
    ADD CONSTRAINT opportunity_stage_history_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: orders orders_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: orders orders_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: orders orders_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: orders orders_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: orders orders_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: orders orders_quote_id_quotes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_quote_id_quotes_id_fk FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: price_book_entries price_book_entries_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: price_book_entries price_book_entries_price_book_id_price_books_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_price_book_id_price_books_id_fk FOREIGN KEY (price_book_id) REFERENCES public.price_books(id);


--
-- Name: price_book_entries price_book_entries_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: price_books price_books_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_books
    ADD CONSTRAINT price_books_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: product_bundle_items product_bundle_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bundle_items
    ADD CONSTRAINT product_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.product_bundles(id) ON DELETE CASCADE;


--
-- Name: product_bundle_items product_bundle_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_bundle_items
    ADD CONSTRAINT product_bundle_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_rules product_rules_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_rules
    ADD CONSTRAINT product_rules_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: products products_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: quote_attachments quote_attachments_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_attachments
    ADD CONSTRAINT quote_attachments_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: quote_items quote_items_price_book_entry_id_price_book_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_price_book_entry_id_price_book_entries_id_fk FOREIGN KEY (price_book_entry_id) REFERENCES public.price_book_entries(id) ON DELETE SET NULL;


--
-- Name: quote_items quote_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: quote_items quote_items_quote_id_quotes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_quotes_id_fk FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: quote_stage_history quote_stage_history_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_stage_history
    ADD CONSTRAINT quote_stage_history_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_team_members quote_team_members_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_team_members
    ADD CONSTRAINT quote_team_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: quote_team_members quote_team_members_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_team_members
    ADD CONSTRAINT quote_team_members_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_team_members quote_team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_team_members
    ADD CONSTRAINT quote_team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: quotes quotes_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: quotes quotes_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: quotes quotes_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: quotes quotes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: quotes quotes_price_book_id_price_books_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_price_book_id_price_books_id_fk FOREIGN KEY (price_book_id) REFERENCES public.price_books(id) ON DELETE SET NULL;


--
-- Name: record_access_audit_log record_access_audit_log_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access_audit_log
    ADD CONSTRAINT record_access_audit_log_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: record_access record_access_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access
    ADD CONSTRAINT record_access_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: record_access record_access_record_type_key_record_types_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_access
    ADD CONSTRAINT record_access_record_type_key_record_types_key_fk FOREIGN KEY (record_type_key) REFERENCES public.record_types(key) ON DELETE CASCADE;


--
-- Name: record_types record_types_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.record_types
    ADD CONSTRAINT record_types_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: roles roles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: screen_access screen_access_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_access
    ADD CONSTRAINT screen_access_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: screen_access screen_access_role_key_roles_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_access
    ADD CONSTRAINT screen_access_role_key_roles_key_fk FOREIGN KEY (role_key) REFERENCES public.roles(key) ON DELETE CASCADE;


--
-- Name: screen_access screen_access_screen_key_screens_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_access
    ADD CONSTRAINT screen_access_screen_key_screens_key_fk FOREIGN KEY (screen_key) REFERENCES public.screens(key) ON DELETE CASCADE;


--
-- Name: screens screens_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: social_messages social_messages_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_messages
    ADD CONSTRAINT social_messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: social_messages social_messages_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_messages
    ADD CONSTRAINT social_messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: social_messages social_messages_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_messages
    ADD CONSTRAINT social_messages_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: social_messages social_messages_sent_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_messages
    ADD CONSTRAINT social_messages_sent_by_user_id_fkey FOREIGN KEY (sent_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stims_attainment stims_attainment_fiscal_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_attainment
    ADD CONSTRAINT stims_attainment_fiscal_period_id_fkey FOREIGN KEY (fiscal_period_id) REFERENCES public.stims_fiscal_periods(id) ON DELETE SET NULL;


--
-- Name: stims_calc_runs stims_calc_runs_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_calc_runs
    ADD CONSTRAINT stims_calc_runs_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.stims_target_cycles(id) ON DELETE SET NULL;


--
-- Name: stims_calc_runs stims_calc_runs_fiscal_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_calc_runs
    ADD CONSTRAINT stims_calc_runs_fiscal_period_id_fkey FOREIGN KEY (fiscal_period_id) REFERENCES public.stims_fiscal_periods(id) ON DELETE SET NULL;


--
-- Name: stims_disputes stims_disputes_payout_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_disputes
    ADD CONSTRAINT stims_disputes_payout_line_id_fkey FOREIGN KEY (payout_line_id) REFERENCES public.stims_payout_lines(id) ON DELETE SET NULL;


--
-- Name: stims_payout_lines stims_payout_lines_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_payout_lines
    ADD CONSTRAINT stims_payout_lines_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.stims_calc_runs(id) ON DELETE CASCADE;


--
-- Name: stims_plan_assignments stims_plan_assignments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_plan_assignments
    ADD CONSTRAINT stims_plan_assignments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.stims_incentive_plans(id) ON DELETE CASCADE;


--
-- Name: stims_plan_tiers stims_plan_tiers_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_plan_tiers
    ADD CONSTRAINT stims_plan_tiers_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.stims_incentive_plans(id) ON DELETE CASCADE;


--
-- Name: stims_quotas stims_quotas_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_quotas
    ADD CONSTRAINT stims_quotas_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.stims_target_cycles(id) ON DELETE CASCADE;


--
-- Name: stims_target_cycles stims_target_cycles_fiscal_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stims_target_cycles
    ADD CONSTRAINT stims_target_cycles_fiscal_period_id_fkey FOREIGN KEY (fiscal_period_id) REFERENCES public.stims_fiscal_periods(id) ON DELETE SET NULL;


--
-- Name: users users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: website_visits website_visits_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_visits
    ADD CONSTRAINT website_visits_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 5hhOL9jMPp0awjZXKpOV7V5vUCKXEqBPyy3eC0tzJ6dtPyeqAPxGmmIABBilt4e

