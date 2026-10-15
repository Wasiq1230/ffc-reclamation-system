import os
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, engine, Base
from backend.app.models.user import User
from backend.app.models.organization import Plant, Department, ExternalCustomer
from backend.app.services.auth import get_password_hash

def seed_database(db: Session = None):
    close_at_end = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_at_end = True

    try:
        # 1. Seed Plants
        plant1 = db.query(Plant).filter(Plant.code == "PLANT_1").first()
        if not plant1:
            plant1 = Plant(name="Plant 1", code="PLANT_1", description="FFC Production Plant 1 — Goth Machhi")
            db.add(plant1)
            db.flush()

        plant2 = db.query(Plant).filter(Plant.code == "PLANT_2").first()
        if not plant2:
            plant2 = Plant(name="Plant 2", code="PLANT_2", description="FFC Production Plant 2 — Goth Machhi")
            db.add(plant2)
            db.flush()

        # 2. Seed Plant 1 Departments: Ammonia, Urea, Utilities, Machinery
        p1_depts = [
            ("Ammonia", "P1_AMM", "Plant 1 Ammonia Operating Unit"),
            ("Urea", "P1_UREA", "Plant 1 Urea Synthesis & Prilling"),
            ("Utilities", "P1_UTL", "Plant 1 Power, Steam & Utilities Generation"),
            ("Machinery", "P1_MACH", "Plant 1 Rotating & Static Machinery Workshop"),
        ]
        for name, code, desc in p1_depts:
            dept = db.query(Department).filter(Department.plant_id == plant1.id, Department.name == name).first()
            if not dept:
                db.add(Department(plant_id=plant1.id, name=name, code=code, description=desc))

        # 3. Seed Plant 2 Departments: Ammonia, Urea, Machinery (NO Utilities!)
        p2_depts = [
            ("Ammonia", "P2_AMM", "Plant 2 Ammonia Synthesis"),
            ("Urea", "P2_UREA", "Plant 2 Urea Prilling Unit"),
            ("Machinery", "P2_MACH", "Plant 2 Mechanical Maintenance Section"),
        ]
        for name, code, desc in p2_depts:
            dept = db.query(Department).filter(Department.plant_id == plant2.id, Department.name == name).first()
            if not dept:
                db.add(Department(plant_id=plant2.id, name=name, code=code, description=desc))

        # 4. Seed sample External Customers under Miscellaneous / External
        ext_cust = db.query(ExternalCustomer).filter(ExternalCustomer.customer_name == "Engro Fertilizers Daharki").first()
        if not ext_cust:
            db.add(ExternalCustomer(
                customer_name="Engro Fertilizers Daharki",
                plant_facility_name="Base Plant Daharki",
                department_operating_area="Refrigeration Section",
                contact_person="Engr. M. Tariq",
                phone="+92 300 1234567",
                email="tariq@engro.com",
                address="Daharki, Sindh",
                reference_number="ENG-VR-2026-01"
            ))

        ext_cust2 = db.query(ExternalCustomer).filter(ExternalCustomer.customer_name == "Fatima Fertilizer Sadiqabad").first()
        if not ext_cust2:
            db.add(ExternalCustomer(
                customer_name="Fatima Fertilizer Sadiqabad",
                plant_facility_name="CAN Plant",
                department_operating_area="High Pressure Ammonia Area",
                contact_person="Engr. Asif Khan",
                phone="+92 301 9876543",
                email="asif@fatima-group.com",
                address="Mukhtar Garh, Sadiqabad",
                reference_number="FAT-VALVE-902"
            ))

        # 5. Seed Users
        admin_pass = os.getenv("ADMIN_INITIAL_PASSWORD", "Admin@FFC2026!")
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@ffc.com.pk",
                phone_number="+923001234567",
                full_name="System Administrator",
                p_number="P-0001",
                role="admin",
                hashed_password=get_password_hash(admin_pass),
                is_active=True,
                is_phone_verified=True,
                is_email_verified=True,
                account_status="active"
            )
            db.add(admin_user)
        else:
            if not admin_user.phone_number:
                admin_user.phone_number = "+923001234567"
            admin_user.is_phone_verified = True
            admin_user.is_email_verified = True
            admin_user.account_status = "active"

        # Operational staff
        staff_list = [
            ("fab_staff", "fab@ffc.com.pk", "+923001234568", "FAB Registration Staff", "P-1042", "fab_shop", "FabShop@2026!"),
            ("technician1", "tech1@ffc.com.pk", "+923001234569", "Muhammad Akram (Machinist)", "P-2055", "technician", "Tech@2026!"),
            ("inspector1", "inspector@ffc.com.pk", "+923001234570", "Tariq Mahmood (QA Inspector)", "P-3088", "inspector", "Insp@2026!"),
            ("viewer1", "manager@ffc.com.pk", "+923001234571", "Plant Maintenance Manager", "P-4012", "viewer", "View@2026!"),
        ]
        for uname, uemail, uphone, ufullname, upno, urole, upass in staff_list:
            u = db.query(User).filter(User.username == uname).first()
            if not u:
                db.add(User(
                    username=uname,
                    email=uemail,
                    phone_number=uphone,
                    full_name=ufullname,
                    p_number=upno,
                    role=urole,
                    hashed_password=get_password_hash(upass),
                    is_active=True,
                    is_phone_verified=True,
                    is_email_verified=True,
                    account_status="active"
                ))
            else:
                if not u.phone_number:
                    u.phone_number = uphone
                u.is_phone_verified = True
                u.is_email_verified = True
                u.account_status = "active"

        db.commit()
        print("Database seeded successfully with Plants, Departments, and initial accounts.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        if close_at_end:
            db.close()

if __name__ == "__main__":
    seed_database()
